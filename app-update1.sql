-- =====================================================================
--  APP UPDATE 1  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update8.sql, workers.sql, workers-update1.sql, events.sql). Safe to re-run.
--
--  1) Enquiries to the admin from ANY menu (topic + what it is about).
--  2) Contact history: every Call / WhatsApp tap and every "ask the admin" enquiry is recorded;
--     both sides can see it, and the admin can see everything per person.
--  3) Chat between two people - OFF by default, switched on only when the admin approves it.
--  4) More worker types and event categories (with emoji), including jewellery.
-- =====================================================================

-- ---------------------------------------------------------------- 1) enquiries from any menu
alter table public.matrimony_messages add column if not exists topic     text not null default 'matrimony';
alter table public.matrimony_messages add column if not exists ref_label text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matrimony_messages_topic_chk') then
    alter table public.matrimony_messages
      add constraint matrimony_messages_topic_chk check (topic in ('general', 'matrimony', 'travels', 'workers', 'events'));
  end if;
end $$;

create or replace function public.matrimony_message_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open'; new.admin_reply := null; new.replied_at := null; new.reply_seen := true;
    return new;
  end if;
  new.from_user := old.from_user; new.body := old.body; new.created_at := old.created_at;   -- never change
  new.topic := old.topic; new.ref_label := old.ref_label;
  if public.matrimony_has_perm('messages') then
    if new.admin_reply is distinct from old.admin_reply or new.status is distinct from old.status then
      new.replied_at := now(); new.reply_seen := false;
    end if;
  else
    new.status := old.status; new.admin_reply := old.admin_reply; new.replied_at := old.replied_at;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- 2) contact history
create table if not exists public.contact_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references auth.users(id) on delete cascade,     -- who called / messaged
  actor_name   text,
  kind         text not null check (kind in ('worker', 'event')),
  target_id    uuid not null,                                                 -- workers.id or event_profiles.id
  target_name  text,
  target_owner uuid references auth.users(id) on delete set null,             -- the provider's own account (if any)
  method       text not null check (method in ('call', 'whatsapp', 'enquiry')),
  created_at   timestamptz not null default now()
);
create index if not exists contact_log_actor_idx  on public.contact_log (actor_id, created_at desc);
create index if not exists contact_log_target_idx on public.contact_log (target_id, created_at desc);
create index if not exists contact_log_owner_idx  on public.contact_log (target_owner, created_at desc);

-- the database fills in who / what, so a user cannot fake another person's history
create or replace function public.contact_log_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actor_id := auth.uid();
  new.actor_name := coalesce(
    (select p.full_name from public.matrimony_profiles p where p.user_id = auth.uid()),
    (select split_part(u.email, '@', 1) from auth.users u where u.id = auth.uid()),
    'User');
  if new.kind = 'worker' then
    select w.name, w.owner_id into new.target_name, new.target_owner from public.workers w where w.id = new.target_id;
  else
    select e.name, e.owner_id into new.target_name, new.target_owner from public.event_profiles e where e.id = new.target_id;
  end if;
  if new.target_name is null then raise exception 'Unknown profile'; end if;
  -- the same action on the same profile within a minute is recorded once
  if exists (select 1 from public.contact_log c
             where c.actor_id = new.actor_id and c.target_id = new.target_id and c.method = new.method
               and c.created_at > now() - interval '60 seconds') then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists contact_log_guard_trg on public.contact_log;
create trigger contact_log_guard_trg before insert on public.contact_log
  for each row execute function public.contact_log_guard();

alter table public.contact_log enable row level security;
drop policy if exists cl_select on public.contact_log;
create policy cl_select on public.contact_log for select to authenticated
  using (actor_id = auth.uid() or target_owner = auth.uid() or public.matrimony_is_admin());
drop policy if exists cl_insert on public.contact_log;
create policy cl_insert on public.contact_log for insert to authenticated with check (true);   -- the trigger sets actor_id = the caller
drop policy if exists cl_delete on public.contact_log;
create policy cl_delete on public.contact_log for delete to authenticated using (public.matrimony_is_admin());

-- ---------------------------------------------------------------- 3) chat between two people (admin approves first)
create table if not exists public.chat_links (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users(id) on delete cascade,   -- who asked
  user_b     uuid not null references auth.users(id) on delete cascade,   -- the other person
  a_name     text,
  b_name     text,
  context    text,                                                         -- e.g. "Worker: Ravi Kumar"
  status     text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (user_a <> user_b)
);
create unique index if not exists chat_links_pair_uni on public.chat_links (least(user_a, user_b), greatest(user_a, user_b));

create or replace function public.chat_links_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.user_a := auth.uid(); new.status := 'requested'; new.decided_at := null;
    new.a_name := coalesce(
      (select p.full_name from public.matrimony_profiles p where p.user_id = auth.uid()),
      (select split_part(u.email, '@', 1) from auth.users u where u.id = auth.uid()), 'User');
    new.b_name := left(coalesce(new.b_name, 'User'), 80);
    new.context := left(new.context, 120);
  else
    if not public.matrimony_is_admin() then raise exception 'Only the admin can approve a chat'; end if;
    new.user_a := old.user_a; new.user_b := old.user_b; new.a_name := old.a_name; new.b_name := old.b_name; new.context := old.context;
    if new.status is distinct from old.status then new.decided_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists chat_links_guard_trg on public.chat_links;
create trigger chat_links_guard_trg before insert or update on public.chat_links
  for each row execute function public.chat_links_guard();

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid not null references public.chat_links(id) on delete cascade,
  sender     uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists chat_messages_link_idx on public.chat_messages (link_id, created_at);

create or replace function public.chat_is_party(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_links l where l.id = lid and (l.user_a = auth.uid() or l.user_b = auth.uid()));
$$;
-- sending is possible ONLY while the admin has the link approved
create or replace function public.chat_can_send(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_links l where l.id = lid and l.status = 'approved' and (l.user_a = auth.uid() or l.user_b = auth.uid()));
$$;

create or replace function public.chat_messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.sender := auth.uid(); new.read_at := null;
  else
    new.link_id := old.link_id; new.sender := old.sender; new.body := old.body; new.created_at := old.created_at;
    if old.sender = auth.uid() then new.read_at := old.read_at; end if;     -- you cannot mark your own message as read
  end if;
  return new;
end $$;
drop trigger if exists chat_messages_guard_trg on public.chat_messages;
create trigger chat_messages_guard_trg before insert or update on public.chat_messages
  for each row execute function public.chat_messages_guard();

alter table public.chat_links    enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists cl2_select on public.chat_links;
create policy cl2_select on public.chat_links for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or public.matrimony_is_admin());
drop policy if exists cl2_insert on public.chat_links;
create policy cl2_insert on public.chat_links for insert to authenticated with check (user_a = auth.uid());
drop policy if exists cl2_update on public.chat_links;
create policy cl2_update on public.chat_links for update to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());
drop policy if exists cl2_delete on public.chat_links;
create policy cl2_delete on public.chat_links for delete to authenticated using (public.matrimony_is_admin());

drop policy if exists cm_select on public.chat_messages;
create policy cm_select on public.chat_messages for select to authenticated
  using (public.chat_is_party(link_id) or public.matrimony_is_admin());
drop policy if exists cm_insert on public.chat_messages;
create policy cm_insert on public.chat_messages for insert to authenticated
  with check (sender = auth.uid() and public.chat_can_send(link_id));
drop policy if exists cm_update on public.chat_messages;
create policy cm_update on public.chat_messages for update to authenticated
  using (public.chat_is_party(link_id)) with check (public.chat_is_party(link_id));
drop policy if exists cm_delete on public.chat_messages;
create policy cm_delete on public.chat_messages for delete to authenticated using (public.matrimony_is_admin());

-- ---------------------------------------------------------------- 4) more worker types and event categories
insert into public.worker_types (name, icon, sort_order) values
  ('Jeweller', '💎', 170), ('Goldsmith', '💍', 180), ('Beautician', '💅', 190), ('Barber', '💈', 200),
  ('Mobile Repair', '📱', 210), ('TV & Fridge Repair', '📺', 220), ('Washing Machine Repair', '🧺', 230),
  ('Water Tank Cleaning', '💧', 240), ('Pest Control', '🐜', 250), ('Interior Designer', '🛋️', 260),
  ('Packers & Movers', '🚚', 270), ('Glass & Aluminium Work', '🪟', 280), ('Borewell & Motor', '⛏️', 290),
  ('CCTV Installer', '📹', 300), ('Solar Installer', '☀️', 310), ('Waterproofing', '☔', 320),
  ('Marble & Flooring', '🪨', 330), ('Tutor', '📚', 340), ('Caregiver / Nurse', '🩺', 350),
  ('Security Guard', '💂', 360), ('Car Wash', '🚿', 370), ('Tyre & Puncture', '🛞', 380)
on conflict do nothing;

insert into public.event_categories (name, icon, sort_order) values
  ('Sweets & Snacks', '🍬', 210), ('Ice Cream & Juice Counter', '🍦', 220), ('Valet Parking', '🅿️', 230),
  ('Fireworks', '🎆', 240), ('Balloon Decoration', '🎈', 250), ('Pooja Items', '🕉️', 260),
  ('Saree Draping', '🥻', 270), ('Bridal Jewellery Rental', '💎', 280), ('Ghodi & Baraat Horse', '🐎', 290),
  ('Live Orchestra', '🎻', 300), ('Dance Troupe', '💃', 310), ('Magician & Kids Shows', '🪄', 320),
  ('Rangoli Artist', '🎨', 330), ('Vessels & Crockery Rental', '🍴', 340), ('Drinking Water Supply', '🥤', 350),
  ('Housekeeping Staff', '🧹', 360), ('Security & Bouncers', '🛡️', 370), ('Generator & Power Backup', '🔌', 380),
  ('AC & Cooler Rental', '❄️', 390), ('Live Streaming', '🎥', 400), ('Drone Shots', '🚁', 410),
  ('LED Screens', '📺', 420), ('Cold Fire & Effects', '✨', 430), ('Photo Booth', '📷', 440)
on conflict do nothing;
