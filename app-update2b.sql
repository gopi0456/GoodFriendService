-- =====================================================================
--  APP UPDATE 2B  (part 2 of 3)  -  alerts for each person
--  (someone contacted you, new chat message, admin replied, interest ...), created by database triggers.
--  Run it ONCE, after 2A. Needs app-update1.sql to have been run before. Safe to run again.
-- =====================================================================

create table if not exists public.app_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('contact', 'chat_message', 'chat_approved', 'admin_reply', 'interest', 'request', 'info', 'update')),
  title      text not null,
  body       text not null,
  ref        text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists app_notifications_user_idx   on public.app_notifications (user_id, created_at desc);
create index if not exists app_notifications_unread_idx on public.app_notifications (user_id) where read_at is null;

alter table public.app_notifications enable row level security;
drop policy if exists an_select on public.app_notifications;
create policy an_select on public.app_notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists an_update on public.app_notifications;
create policy an_update on public.app_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists an_delete on public.app_notifications;
create policy an_delete on public.app_notifications for delete to authenticated using (user_id = auth.uid());
-- (no insert policy: only the triggers below create alerts)

-- a user can only mark an alert as read; nothing else can be changed
create or replace function public.app_notifications_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.user_id := old.user_id; new.kind := old.kind; new.title := old.title; new.body := old.body; new.ref := old.ref; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists app_notifications_guard_trg on public.app_notifications;
create trigger app_notifications_guard_trg before update on public.app_notifications
  for each row execute function public.app_notifications_guard();

create or replace function public.app_notify(uid uuid, k text, t text, b text, r text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if uid is null then return; end if;
  insert into public.app_notifications (user_id, kind, title, body, ref) values (uid, k, left(t, 120), left(b, 300), r);
end $$;

create or replace function public.app_admin_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = 'scgopi.gopi@gmail.com';    -- same admin email as matrimony_is_admin()
$$;

-- someone tapped Call / WhatsApp / asked the admin about a worker or event listing -> alert to its owner
create or replace function public.notify_contact_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare verb text;
begin
  if new.target_owner is null or new.target_owner = new.actor_id then return new; end if;
  verb := case new.method when 'call' then 'tapped Call on' when 'whatsapp' then 'opened WhatsApp for' else 'asked the admin for the number of' end;
  perform public.app_notify(new.target_owner, 'contact', 'Someone is interested to contact you',
    coalesce(new.actor_name, 'Someone') || ' ' || verb || ' your listing "' || coalesce(new.target_name, '') || '".', new.target_id::text);
  return new;
end $$;
drop trigger if exists notify_contact_log_trg on public.contact_log;
create trigger notify_contact_log_trg after insert on public.contact_log for each row execute function public.notify_contact_log();

-- chat: a request goes to the admin; when approved both people are told
create or replace function public.notify_chat_links() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if tg_op = 'INSERT' then
    for a in select public.app_admin_ids() loop
      perform public.app_notify(a, 'request', 'New chat request', coalesce(new.a_name, 'Someone') || ' wants to chat with ' || coalesce(new.b_name, 'someone') || '.', new.id::text);
    end loop;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.app_notify(new.user_a, 'chat_approved', 'Chat approved', 'You can now chat with ' || coalesce(new.b_name, 'them') || '.', new.id::text);
    perform public.app_notify(new.user_b, 'chat_approved', 'Chat approved', 'You can now chat with ' || coalesce(new.a_name, 'them') || '.', new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_chat_links_trg on public.chat_links;
create trigger notify_chat_links_trg after insert or update on public.chat_links for each row execute function public.notify_chat_links();

-- chat: a new message -> alert to the other person
create or replace function public.notify_chat_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record; other uuid; sname text;
begin
  select * into l from public.chat_links where id = new.link_id;
  if not found then return new; end if;
  if l.user_a = new.sender then other := l.user_b; sname := l.a_name; else other := l.user_a; sname := l.b_name; end if;
  perform public.app_notify(other, 'chat_message', 'New message from ' || coalesce(sname, 'someone'), left(new.body, 90), new.link_id::text);
  return new;
end $$;
drop trigger if exists notify_chat_messages_trg on public.chat_messages;
create trigger notify_chat_messages_trg after insert on public.chat_messages for each row execute function public.notify_chat_messages();

-- messages to the admin: new one -> admin is told; admin reply -> the user is told
create or replace function public.notify_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if tg_op = 'INSERT' then
    for a in select public.app_admin_ids() loop
      perform public.app_notify(a, 'request', 'New enquiry (' || coalesce(new.topic, 'matrimony') || ')', left(new.body, 120), new.id::text);
    end loop;
  elsif new.admin_reply is not null and new.admin_reply is distinct from old.admin_reply then
    perform public.app_notify(new.from_user, 'admin_reply', 'The admin replied to you', left(new.admin_reply, 120), new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_messages_trg on public.matrimony_messages;
create trigger notify_messages_trg after insert or update on public.matrimony_messages for each row execute function public.notify_messages();

-- matrimony: someone showed interest / an interest was accepted
create or replace function public.notify_interests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.app_notify(new.to_user, 'interest', 'Someone is interested in your profile', 'Open Matrimonial and look at Interests to see who.', new.from_user::text);
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.app_notify(new.from_user, 'interest', 'Your interest was accepted', 'Open Matrimonial and look at Interests.', new.to_user::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_interests_trg on public.matrimony_interests;
create trigger notify_interests_trg after insert or update on public.matrimony_interests for each row execute function public.notify_interests();

-- matrimony: a request for a phone number / kundli -> admin is told
create or replace function public.notify_contact_requests() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select public.app_admin_ids() loop
    perform public.app_notify(a, 'request', 'New ' || coalesce(new.kind, 'contact') || ' request', 'A member is waiting for your answer.', new.id::text);
  end loop;
  return new;
end $$;
drop trigger if exists notify_contact_requests_trg on public.matrimony_contact_requests;
create trigger notify_contact_requests_trg after insert on public.matrimony_contact_requests for each row execute function public.notify_contact_requests();

-- check: this should show a table name, not null
select to_regclass('public.app_notifications') as app_notifications_created;
