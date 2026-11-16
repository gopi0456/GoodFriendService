-- =====================================================================
--  MATRIMONIAL UPDATE 1  -  run ONCE in Supabase > SQL Editor
--  (after matrimony.sql). Safe to re-run. Touches only matrimony_* objects.
--
--  1) Every registered profile is visible right away with BASIC info
--     (name, photo, age, qualification). Full details appear after admin approval.
--  2) Mobile number stays hidden until the user sends an in-app message to the
--     admin and the admin releases the number.
-- =====================================================================

-- helper: is this profile visible in the directory? (works for pending ones too)
create or replace function public.matrimony_profile_listed(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matrimony_profiles where user_id = uid and status in ('pending','approved'));
$$;

-- helper: has the caller registered a profile?
create or replace function public.matrimony_has_profile() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matrimony_profiles where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- DIRECTORY VIEW
-- Basic columns for everyone; detail columns are NULL until the profile is approved.
-- Exact date of birth is never exposed - only the age.
create or replace view public.matrimony_directory as
select
  p.user_id, p.full_name, p.gender,
  extract(year from age(p.dob))::int as age,
  p.education, p.photo_path, p.status,
  case when p.status = 'approved' then p.height_cm end              as height_cm,
  case when p.status = 'approved' then p.marital_status end         as marital_status,
  case when p.status = 'approved' then p.religion end               as religion,
  case when p.status = 'approved' then p.caste end                  as caste,
  case when p.status = 'approved' then p.mother_tongue end          as mother_tongue,
  case when p.status = 'approved' then p.occupation end             as occupation,
  case when p.status = 'approved' then p.annual_income end          as annual_income,
  case when p.status = 'approved' then p.city end                   as city,
  case when p.status = 'approved' then p.state end                  as state,
  case when p.status = 'approved' then p.about end                  as about,
  case when p.status = 'approved' then p.partner_expectations end   as partner_expectations,
  p.created_at
from public.matrimony_profiles p
where p.status in ('pending','approved')
  and public.matrimony_has_profile();

revoke all on public.matrimony_directory from anon;
grant select on public.matrimony_directory to authenticated;

-- ---------------------------------------------------------------- CONTACT REQUESTS (in-app messages to admin)
create table if not exists public.matrimony_contact_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references auth.users(id) on delete cascade,
  about_user   uuid not null references auth.users(id) on delete cascade,
  message      text not null check (char_length(message) between 1 and 500),
  status       text not null default 'pending' check (status in ('pending','granted','declined')),
  admin_reply  text,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, about_user),
  check (from_user <> about_user)
);
create index if not exists matrimony_requests_status_idx on public.matrimony_contact_requests (status);

create or replace function public.matrimony_request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.admin_reply := null;
    new.responded_at := null;
  else
    if not public.matrimony_is_admin() then raise exception 'Only the admin can answer requests'; end if;
    if new.from_user <> old.from_user or new.about_user <> old.about_user or new.message <> old.message then
      raise exception 'Request details cannot be changed';
    end if;
    if new.status <> old.status then new.responded_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists matrimony_request_guard_trg on public.matrimony_contact_requests;
create trigger matrimony_request_guard_trg
  before insert or update on public.matrimony_contact_requests
  for each row execute function public.matrimony_request_guard();

alter table public.matrimony_contact_requests enable row level security;

drop policy if exists mm_requests_select on public.matrimony_contact_requests;
create policy mm_requests_select on public.matrimony_contact_requests for select to authenticated
  using (from_user = auth.uid() or public.matrimony_is_admin());
drop policy if exists mm_requests_insert on public.matrimony_contact_requests;
create policy mm_requests_insert on public.matrimony_contact_requests for insert to authenticated
  with check (from_user = auth.uid() and public.matrimony_has_profile() and public.matrimony_profile_listed(about_user));
drop policy if exists mm_requests_update on public.matrimony_contact_requests;
create policy mm_requests_update on public.matrimony_contact_requests for update to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());
drop policy if exists mm_requests_delete on public.matrimony_contact_requests;
create policy mm_requests_delete on public.matrimony_contact_requests for delete to authenticated
  using ((from_user = auth.uid() and status = 'pending') or public.matrimony_is_admin());

-- ---------------------------------------------------------------- PHONE VISIBILITY
-- Replaces the old rule (accepted interest). Now: owner, admin, or an admin-GRANTED request.
drop policy if exists mm_contacts_select on public.matrimony_contacts;
create policy mm_contacts_select on public.matrimony_contacts for select to authenticated
  using (
    user_id = auth.uid() or public.matrimony_is_admin() or exists (
      select 1 from public.matrimony_contact_requests r
      where r.status = 'granted' and r.from_user = auth.uid() and r.about_user = matrimony_contacts.user_id
    )
  );
