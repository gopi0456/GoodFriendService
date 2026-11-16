-- =====================================================================
--  MATRIMONIAL UPDATE 8  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update7.sql). Safe to re-run.
--
--  A) Kundli requests: a user asks the ADMIN for another person's kundli.
--     They share the phone-request table (matrimony_contact_requests) through a new "kind" column.
--     The person's birth details stay hidden until the admin grants the request.
--  B) Messages: a user can write to the ADMIN (only the admin - there is no user-to-user chat).
-- =====================================================================

-- ---------------------------------------------------------------- A) kundli requests
alter table public.matrimony_contact_requests add column if not exists kind text not null default 'contact';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matrimony_contact_requests_kind_chk') then
    alter table public.matrimony_contact_requests
      add constraint matrimony_contact_requests_kind_chk check (kind in ('contact', 'kundli'));
  end if;
end $$;

-- one phone request AND one kundli request per person is allowed (the old rule allowed only one of them)
alter table public.matrimony_contact_requests drop constraint if exists matrimony_contact_requests_from_user_about_user_key;
create unique index if not exists matrimony_contact_requests_kind_uni
  on public.matrimony_contact_requests (from_user, about_user, kind);
create index if not exists matrimony_contact_requests_kind_idx on public.matrimony_contact_requests (kind, status);

-- Birth details of ANOTHER person: only for the admin / staff, the person himself,
-- or a user whose kundli request the admin has granted.
drop function if exists public.matrimony_kundli_birth(uuid);
create function public.matrimony_kundli_birth(target uuid)
returns table (full_name text, gender text, dob date, birth_time time, birth_place text, birth_utc_offset numeric, city text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.gender, p.dob, p.birth_time, p.birth_place, p.birth_utc_offset, p.city
  from public.matrimony_profiles p
  where p.user_id = target
    and (
      public.matrimony_has_perm('messages') or public.matrimony_has_perm('review') or public.matrimony_has_perm('add_profile')
      or p.user_id = auth.uid()
      or exists (
        select 1 from public.matrimony_contact_requests r
        where r.kind = 'kundli' and r.status = 'granted' and r.from_user = auth.uid() and r.about_user = target
      )
    );
$$;
revoke all on function public.matrimony_kundli_birth(uuid) from public, anon;
grant execute on function public.matrimony_kundli_birth(uuid) to authenticated;

-- ---------------------------------------------------------------- B) messages to the admin
create table if not exists public.matrimony_messages (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  status      text not null default 'open' check (status in ('open', 'answered')),
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 500),
  reply_seen  boolean not null default true,        -- false = the user has an unread reply
  created_at  timestamptz not null default now(),
  replied_at  timestamptz
);
create index if not exists matrimony_messages_status_idx on public.matrimony_messages (status);
create index if not exists matrimony_messages_from_idx   on public.matrimony_messages (from_user, created_at desc);

create or replace function public.matrimony_message_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open'; new.admin_reply := null; new.replied_at := null; new.reply_seen := true;
    return new;
  end if;
  new.from_user := old.from_user; new.body := old.body; new.created_at := old.created_at;   -- never change
  if public.matrimony_has_perm('messages') then
    if new.admin_reply is distinct from old.admin_reply or new.status is distinct from old.status then
      new.replied_at := now(); new.reply_seen := false;                                    -- something new for the user
    end if;
  else
    new.status := old.status; new.admin_reply := old.admin_reply; new.replied_at := old.replied_at;   -- the user can only mark the reply as read
  end if;
  return new;
end $$;
drop trigger if exists matrimony_message_guard_trg on public.matrimony_messages;
create trigger matrimony_message_guard_trg before insert or update on public.matrimony_messages
  for each row execute function public.matrimony_message_guard();

alter table public.matrimony_messages enable row level security;
drop policy if exists mm_msgs_select on public.matrimony_messages;
create policy mm_msgs_select on public.matrimony_messages for select to authenticated
  using (from_user = auth.uid() or public.matrimony_has_perm('messages'));
drop policy if exists mm_msgs_insert on public.matrimony_messages;
create policy mm_msgs_insert on public.matrimony_messages for insert to authenticated
  with check (from_user = auth.uid());
drop policy if exists mm_msgs_update on public.matrimony_messages;
create policy mm_msgs_update on public.matrimony_messages for update to authenticated
  using (from_user = auth.uid() or public.matrimony_has_perm('messages'))
  with check (from_user = auth.uid() or public.matrimony_has_perm('messages'));
drop policy if exists mm_msgs_delete on public.matrimony_messages;
create policy mm_msgs_delete on public.matrimony_messages for delete to authenticated
  using ((from_user = auth.uid() and status = 'open') or public.matrimony_has_perm('messages'));
