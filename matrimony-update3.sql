-- =====================================================================
--  MATRIMONIAL UPDATE 3  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update2.sql). Safe to re-run.
--
--  Password change with admin approval:
--    user requests  ->  admin/staff (with "add users" access) approves  ->
--    user can set a new password within 24 hours (one time).
-- =====================================================================
create table if not exists public.matrimony_password_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','approved','denied','used')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz
);
-- only one open (pending/approved) request per user
create unique index if not exists matrimony_pwreq_open_idx
  on public.matrimony_password_requests (user_id) where status in ('pending','approved');

create or replace function public.matrimony_pwreq_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.admin_note := null; new.decided_at := null; new.expires_at := null;
    return new;
  end if;
  if new.user_id <> old.user_id then raise exception 'Cannot change the user'; end if;
  -- the user "using" an approved request (through matrimony_password_request_use)
  if coalesce(current_setting('matrimony.pw_use', true), '') = '1' then
    if not (old.status = 'approved' and new.status = 'used') then raise exception 'Invalid change'; end if;
    return new;
  end if;
  if not public.matrimony_has_perm('add_user') then raise exception 'Only the admin can decide password requests'; end if;
  if new.status <> old.status then
    new.decided_at := now();
    if new.status = 'approved' then new.expires_at := now() + interval '24 hours'; end if;
  end if;
  return new;
end $$;
drop trigger if exists matrimony_pwreq_guard_trg on public.matrimony_password_requests;
create trigger matrimony_pwreq_guard_trg
  before insert or update on public.matrimony_password_requests
  for each row execute function public.matrimony_pwreq_guard();

alter table public.matrimony_password_requests enable row level security;
drop policy if exists mm_pwreq_select on public.matrimony_password_requests;
create policy mm_pwreq_select on public.matrimony_password_requests for select to authenticated
  using (user_id = auth.uid() or public.matrimony_has_perm('add_user'));
drop policy if exists mm_pwreq_insert on public.matrimony_password_requests;
create policy mm_pwreq_insert on public.matrimony_password_requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists mm_pwreq_update on public.matrimony_password_requests;
create policy mm_pwreq_update on public.matrimony_password_requests for update to authenticated
  using (public.matrimony_has_perm('add_user')) with check (public.matrimony_has_perm('add_user'));
drop policy if exists mm_pwreq_delete on public.matrimony_password_requests;
create policy mm_pwreq_delete on public.matrimony_password_requests for delete to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- called by the app right after the password was changed: marks the approval as used
create or replace function public.matrimony_password_request_use() returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('matrimony.pw_use', '1', true);
  update public.matrimony_password_requests set status = 'used'
   where user_id = auth.uid() and status = 'approved' and expires_at > now();
  get diagnostics n = row_count;
  perform set_config('matrimony.pw_use', '', true);
  return n > 0;
end $$;
