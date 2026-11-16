-- =====================================================================
--  MATRIMONIAL ADD-ON  -  run ONCE in Supabase > SQL Editor
--  Only creates NEW objects prefixed "matrimony_". Safe to re-run.
--  Existing tables / policies are NOT touched.
-- =====================================================================

-- Admin check (same admin email as src/supabaseClient.js)
create or replace function public.matrimony_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'scgopi.gopi@gmail.com';
$$;

-- ---------------------------------------------------------------- PROFILES
create table if not exists public.matrimony_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null,
  gender         text not null check (gender in ('male','female')),
  dob            date not null,
  height_cm      int  check (height_cm between 100 and 250),
  marital_status text not null default 'never_married'
                 check (marital_status in ('never_married','divorced','widowed','awaiting_divorce')),
  religion       text,
  caste          text,
  mother_tongue  text,
  education      text,
  occupation     text,
  annual_income  text,
  city           text,
  state          text,
  about          text,
  partner_expectations text,
  photo_path     text,
  status         text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists matrimony_profiles_search_idx
  on public.matrimony_profiles (status, gender, dob);

-- Phone numbers live in a separate table so they can be hidden until an interest is accepted
create table if not exists public.matrimony_contacts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  phone      text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.matrimony_interests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references auth.users(id) on delete cascade,
  to_user      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index if not exists matrimony_interests_to_idx   on public.matrimony_interests (to_user);
create index if not exists matrimony_interests_from_idx on public.matrimony_interests (from_user);

create table if not exists public.matrimony_shortlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

-- ---------------------------------------------------------------- TRIGGERS
-- Profile: 18+ only; users can never set/change their own approval status
create or replace function public.matrimony_profile_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dob > (current_date - interval '18 years') then
    raise exception 'You must be at least 18 years old';
  end if;
  if not public.matrimony_is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
    else
      new.status  := old.status;
      new.user_id := old.user_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists matrimony_profile_guard_trg on public.matrimony_profiles;
create trigger matrimony_profile_guard_trg
  before insert or update on public.matrimony_profiles
  for each row execute function public.matrimony_profile_guard();

-- Interest: new ones always start 'pending'; only the status may change afterwards
create or replace function public.matrimony_interest_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.responded_at := null;
  else
    if new.from_user <> old.from_user or new.to_user <> old.to_user then
      raise exception 'Cannot change interest participants';
    end if;
    if new.status <> old.status then new.responded_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists matrimony_interest_guard_trg on public.matrimony_interests;
create trigger matrimony_interest_guard_trg
  before insert or update on public.matrimony_interests
  for each row execute function public.matrimony_interest_guard();

-- ---------------------------------------------------------------- RLS
alter table public.matrimony_profiles  enable row level security;
alter table public.matrimony_contacts  enable row level security;
alter table public.matrimony_interests enable row level security;
alter table public.matrimony_shortlist enable row level security;

-- profiles
drop policy if exists mm_profiles_select on public.matrimony_profiles;
create policy mm_profiles_select on public.matrimony_profiles for select to authenticated
  using (status = 'approved' or user_id = auth.uid() or public.matrimony_is_admin());
drop policy if exists mm_profiles_insert on public.matrimony_profiles;
create policy mm_profiles_insert on public.matrimony_profiles for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists mm_profiles_update on public.matrimony_profiles;
create policy mm_profiles_update on public.matrimony_profiles for update to authenticated
  using (user_id = auth.uid() or public.matrimony_is_admin())
  with check (user_id = auth.uid() or public.matrimony_is_admin());
drop policy if exists mm_profiles_delete on public.matrimony_profiles;
create policy mm_profiles_delete on public.matrimony_profiles for delete to authenticated
  using (user_id = auth.uid() or public.matrimony_is_admin());

-- contacts: owner, admin, or someone with an ACCEPTED interest with the owner
drop policy if exists mm_contacts_select on public.matrimony_contacts;
create policy mm_contacts_select on public.matrimony_contacts for select to authenticated
  using (
    user_id = auth.uid() or public.matrimony_is_admin() or exists (
      select 1 from public.matrimony_interests i
      where i.status = 'accepted'
        and ((i.from_user = auth.uid() and i.to_user = matrimony_contacts.user_id)
          or (i.to_user = auth.uid() and i.from_user = matrimony_contacts.user_id))
    )
  );
drop policy if exists mm_contacts_insert on public.matrimony_contacts;
create policy mm_contacts_insert on public.matrimony_contacts for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists mm_contacts_update on public.matrimony_contacts;
create policy mm_contacts_update on public.matrimony_contacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists mm_contacts_delete on public.matrimony_contacts;
create policy mm_contacts_delete on public.matrimony_contacts for delete to authenticated
  using (user_id = auth.uid());

-- interests: only between two APPROVED profiles; receiver answers; sender may withdraw
drop policy if exists mm_interests_select on public.matrimony_interests;
create policy mm_interests_select on public.matrimony_interests for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid() or public.matrimony_is_admin());
drop policy if exists mm_interests_insert on public.matrimony_interests;
create policy mm_interests_insert on public.matrimony_interests for insert to authenticated
  with check (
    from_user = auth.uid()
    and exists (select 1 from public.matrimony_profiles p where p.user_id = auth.uid() and p.status = 'approved')
    and exists (select 1 from public.matrimony_profiles t where t.user_id = to_user and t.status = 'approved')
  );
drop policy if exists mm_interests_update on public.matrimony_interests;
create policy mm_interests_update on public.matrimony_interests for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());
drop policy if exists mm_interests_delete on public.matrimony_interests;
create policy mm_interests_delete on public.matrimony_interests for delete to authenticated
  using (from_user = auth.uid());

-- shortlist: private to the owner
drop policy if exists mm_shortlist_all on public.matrimony_shortlist;
create policy mm_shortlist_all on public.matrimony_shortlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- PHOTO STORAGE
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('matrimony-photos', 'matrimony-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists mm_photos_select on storage.objects;
create policy mm_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'matrimony-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists mm_photos_insert on storage.objects;
create policy mm_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'matrimony-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists mm_photos_update on storage.objects;
create policy mm_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'matrimony-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists mm_photos_delete on storage.objects;
create policy mm_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'matrimony-photos' and (storage.foldername(name))[1] = auth.uid()::text);
