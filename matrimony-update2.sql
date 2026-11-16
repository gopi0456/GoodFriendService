-- =====================================================================
--  MATRIMONIAL UPDATE 2  -  run ONCE in Supabase > SQL Editor
--  (after matrimony.sql and matrimony-update.sql). Safe to re-run.
--
--  * Staff access: the main admin (scgopi.gopi@gmail.com) can give other users
--    permission to: add users, add/edit profiles, approve/reject profiles,
--    handle contact messages.
--  * Admin list of ALL registered accounts (even those without a profile).
-- =====================================================================

-- ---------------------------------------------------------------- STAFF PERMISSIONS
create table if not exists public.matrimony_staff (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  can_add_user    boolean not null default false,
  can_add_profile boolean not null default false,
  can_review      boolean not null default false,
  can_messages    boolean not null default false,
  updated_at      timestamptz not null default now()
);
alter table public.matrimony_staff enable row level security;

drop policy if exists mm_staff_select_own on public.matrimony_staff;
create policy mm_staff_select_own on public.matrimony_staff for select to authenticated
  using (user_id = auth.uid() or public.matrimony_is_admin());
drop policy if exists mm_staff_admin_all on public.matrimony_staff;
create policy mm_staff_admin_all on public.matrimony_staff for all to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

-- perm: 'add_user' | 'add_profile' | 'review' | 'messages'  (main admin has all)
create or replace function public.matrimony_has_perm(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.matrimony_is_admin() or exists (
    select 1 from public.matrimony_staff s
    where s.user_id = auth.uid()
      and case perm
            when 'add_user'    then s.can_add_user
            when 'add_profile' then s.can_add_profile
            when 'review'      then s.can_review
            when 'messages'    then s.can_messages
            else false end
  );
$$;

-- ---------------------------------------------------------------- LIST OF ALL REGISTERED ACCOUNTS
create or replace function public.matrimony_admin_users()
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
               profile_status text, full_name text)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not (public.matrimony_has_perm('add_user') or public.matrimony_has_perm('add_profile')
       or public.matrimony_has_perm('review')   or public.matrimony_has_perm('messages')) then
    raise exception 'Not allowed';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, p.status, p.full_name
    from auth.users u
    left join public.matrimony_profiles p on p.user_id = u.id
    order by u.created_at desc;
end $$;

-- ---------------------------------------------------------------- PROFILE GUARD (permission aware)
create or replace function public.matrimony_profile_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dob > (current_date - interval '18 years') then
    raise exception 'You must be at least 18 years old';
  end if;
  if tg_op = 'INSERT' then
    -- only admin / staff who may add profiles can choose the status (e.g. approved)
    if not public.matrimony_has_perm('add_profile') then new.status := 'pending'; end if;
  else
    new.user_id := old.user_id;
    if not public.matrimony_has_perm('review') then new.status := old.status; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- PROFILE POLICIES
drop policy if exists mm_profiles_select on public.matrimony_profiles;
create policy mm_profiles_select on public.matrimony_profiles for select to authenticated
  using (status = 'approved' or user_id = auth.uid()
         or public.matrimony_has_perm('review') or public.matrimony_has_perm('add_profile')
         or public.matrimony_has_perm('add_user') or public.matrimony_has_perm('messages'));
drop policy if exists mm_profiles_insert on public.matrimony_profiles;
create policy mm_profiles_insert on public.matrimony_profiles for insert to authenticated
  with check (user_id = auth.uid() or public.matrimony_has_perm('add_profile'));
drop policy if exists mm_profiles_update on public.matrimony_profiles;
create policy mm_profiles_update on public.matrimony_profiles for update to authenticated
  using (user_id = auth.uid() or public.matrimony_has_perm('review') or public.matrimony_has_perm('add_profile'))
  with check (user_id = auth.uid() or public.matrimony_has_perm('review') or public.matrimony_has_perm('add_profile'));

-- ---------------------------------------------------------------- CONTACT (phone) POLICIES
drop policy if exists mm_contacts_select on public.matrimony_contacts;
create policy mm_contacts_select on public.matrimony_contacts for select to authenticated
  using (
    user_id = auth.uid()
    or public.matrimony_has_perm('messages') or public.matrimony_has_perm('add_profile')
    or exists (select 1 from public.matrimony_contact_requests r
               where r.status = 'granted' and r.from_user = auth.uid() and r.about_user = matrimony_contacts.user_id)
  );
drop policy if exists mm_contacts_insert on public.matrimony_contacts;
create policy mm_contacts_insert on public.matrimony_contacts for insert to authenticated
  with check (user_id = auth.uid() or public.matrimony_has_perm('add_profile'));
drop policy if exists mm_contacts_update on public.matrimony_contacts;
create policy mm_contacts_update on public.matrimony_contacts for update to authenticated
  using (user_id = auth.uid() or public.matrimony_has_perm('add_profile'))
  with check (user_id = auth.uid() or public.matrimony_has_perm('add_profile'));

-- ---------------------------------------------------------------- CONTACT REQUEST POLICIES
create or replace function public.matrimony_request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.admin_reply := null; new.responded_at := null;
  else
    if not public.matrimony_has_perm('messages') then raise exception 'Not allowed to answer requests'; end if;
    if new.from_user <> old.from_user or new.about_user <> old.about_user or new.message <> old.message then
      raise exception 'Request details cannot be changed';
    end if;
    if new.status <> old.status then new.responded_at := now(); end if;
  end if;
  return new;
end $$;

drop policy if exists mm_requests_select on public.matrimony_contact_requests;
create policy mm_requests_select on public.matrimony_contact_requests for select to authenticated
  using (from_user = auth.uid() or public.matrimony_has_perm('messages'));
drop policy if exists mm_requests_update on public.matrimony_contact_requests;
create policy mm_requests_update on public.matrimony_contact_requests for update to authenticated
  using (public.matrimony_has_perm('messages')) with check (public.matrimony_has_perm('messages'));
drop policy if exists mm_requests_delete on public.matrimony_contact_requests;
create policy mm_requests_delete on public.matrimony_contact_requests for delete to authenticated
  using ((from_user = auth.uid() and status = 'pending') or public.matrimony_has_perm('messages'));

-- ---------------------------------------------------------------- PHOTO STORAGE (staff may upload for others)
drop policy if exists mm_photos_select on storage.objects;
create policy mm_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'matrimony-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_has_perm('add_profile')));
drop policy if exists mm_photos_insert on storage.objects;
create policy mm_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'matrimony-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_has_perm('add_profile')));
drop policy if exists mm_photos_update on storage.objects;
create policy mm_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'matrimony-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_has_perm('add_profile')));
drop policy if exists mm_photos_delete on storage.objects;
create policy mm_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'matrimony-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_has_perm('add_profile')));
