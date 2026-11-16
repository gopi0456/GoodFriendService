-- =====================================================================
--  EVENTS DIRECTORY  -  run ONCE in Supabase > SQL Editor
--  (needs matrimony.sql already run, because it reuses matrimony_is_admin()).
--  Creates only new objects prefixed "event". Safe to re-run.
--
--  * Event service profiles: halls, catering, decoration, photography, DJ, makeup ... (admin manages the menu)
--  * Each profile has its OWN photo gallery.
--  * A profile's phone is visible to other users only when: the admin approved the profile, the
--    "show all contacts" switch is ON, and the admin has not hidden that one profile's number.
-- =====================================================================

-- ---------------------------------------------------------------- categories (the menu the admin controls)
create table if not exists public.event_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 40),
  icon       text not null default '🎉',
  sort_order int  not null default 100,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists event_categories_name_uni on public.event_categories (lower(name));

-- ---------------------------------------------------------------- profiles
create table if not exists public.event_profiles (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users(id) on delete set null,   -- empty when the admin added it
  name             text not null check (char_length(name) between 2 and 80),
  category_id      uuid not null references public.event_categories(id) on delete restrict,
  area             text,                                                -- city / area served
  address          text,
  about            text check (about is null or char_length(about) <= 800),
  price_text       text check (price_text is null or char_length(price_text) <= 60),      -- e.g. "From Rs 450 per plate"
  capacity_text    text check (capacity_text is null or char_length(capacity_text) <= 60), -- e.g. "100 - 1500 guests"
  tags             text check (tags is null or char_length(tags) <= 200),                 -- comma separated: Veg, Non-veg, AC hall
  experience_years int check (experience_years between 0 and 70),
  verified         boolean not null default false,
  featured         boolean not null default false,
  hide_phone       boolean not null default false,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists event_profiles_idx on public.event_profiles (status, category_id);
create unique index if not exists event_profiles_owner_uni on public.event_profiles (owner_id) where owner_id is not null;

create table if not exists public.event_contacts (
  event_id uuid primary key references public.event_profiles(id) on delete cascade,
  phone    text not null check (phone ~ '^\+?[0-9]{10,15}$')
);

-- the gallery: many photos per profile
create table if not exists public.event_photos (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.event_profiles(id) on delete cascade,
  photo_path text not null,
  sort_order int  not null default 100,            -- the first photo is the cover
  created_at timestamptz not null default now()
);
create index if not exists event_photos_event_idx on public.event_photos (event_id, sort_order);

create table if not exists public.event_settings (
  id            int primary key default 1 check (id = 1),
  show_contacts boolean not null default true,
  updated_at    timestamptz not null default now()
);
insert into public.event_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- helpers + guards
create or replace function public.events_can_edit(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.matrimony_is_admin()
      or exists (select 1 from public.event_profiles e where e.id = eid and e.owner_id = auth.uid());
$$;

create or replace function public.events_can_see(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.events_can_edit(eid)
      or exists (select 1 from public.event_profiles e where e.id = eid and e.status = 'approved');
$$;

create or replace function public.events_can_see_contact(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.events_can_edit(eid)
      or (exists (select 1 from public.event_settings s where s.id = 1 and s.show_contacts)
          and exists (select 1 from public.event_profiles e where e.id = eid and e.status = 'approved' and not e.hide_phone));
$$;

-- only the admin can approve / verify / feature / hide the phone; a new listing always starts as pending
create or replace function public.event_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.matrimony_is_admin() then
      new.status := 'pending'; new.owner_id := auth.uid(); new.verified := false; new.featured := false; new.hide_phone := false;
    end if;
  else
    if not public.matrimony_is_admin() then
      new.status := old.status; new.owner_id := old.owner_id; new.verified := old.verified; new.featured := old.featured; new.hide_phone := old.hide_phone;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists event_profiles_guard_trg on public.event_profiles;
create trigger event_profiles_guard_trg before insert or update on public.event_profiles
  for each row execute function public.event_profiles_guard();

-- at most 20 photos in one gallery
create or replace function public.event_photos_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.event_photos where event_id = new.event_id) >= 20 then
    raise exception 'A gallery can have at most 20 photos';
  end if;
  return new;
end $$;
drop trigger if exists event_photos_limit_trg on public.event_photos;
create trigger event_photos_limit_trg before insert on public.event_photos
  for each row execute function public.event_photos_limit();

-- ---------------------------------------------------------------- row level security
alter table public.event_categories enable row level security;
alter table public.event_profiles   enable row level security;
alter table public.event_contacts   enable row level security;
alter table public.event_photos     enable row level security;
alter table public.event_settings   enable row level security;

drop policy if exists ev_cat_select on public.event_categories;
create policy ev_cat_select on public.event_categories for select to authenticated using (active or public.matrimony_is_admin());
drop policy if exists ev_cat_admin on public.event_categories;
create policy ev_cat_admin on public.event_categories for all to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

drop policy if exists ev_prof_select on public.event_profiles;
create policy ev_prof_select on public.event_profiles for select to authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.matrimony_is_admin());
drop policy if exists ev_prof_insert on public.event_profiles;
create policy ev_prof_insert on public.event_profiles for insert to authenticated
  with check (public.matrimony_is_admin() or owner_id = auth.uid());
drop policy if exists ev_prof_update on public.event_profiles;
create policy ev_prof_update on public.event_profiles for update to authenticated
  using (public.matrimony_is_admin() or owner_id = auth.uid())
  with check (public.matrimony_is_admin() or owner_id = auth.uid());
drop policy if exists ev_prof_delete on public.event_profiles;
create policy ev_prof_delete on public.event_profiles for delete to authenticated using (public.matrimony_is_admin());

drop policy if exists ev_contacts_select on public.event_contacts;
create policy ev_contacts_select on public.event_contacts for select to authenticated using (public.events_can_see_contact(event_id));
drop policy if exists ev_contacts_insert on public.event_contacts;
create policy ev_contacts_insert on public.event_contacts for insert to authenticated with check (public.events_can_edit(event_id));
drop policy if exists ev_contacts_update on public.event_contacts;
create policy ev_contacts_update on public.event_contacts for update to authenticated
  using (public.events_can_edit(event_id)) with check (public.events_can_edit(event_id));
drop policy if exists ev_contacts_delete on public.event_contacts;
create policy ev_contacts_delete on public.event_contacts for delete to authenticated using (public.matrimony_is_admin());

drop policy if exists ev_photos_select on public.event_photos;
create policy ev_photos_select on public.event_photos for select to authenticated using (public.events_can_see(event_id));
drop policy if exists ev_photos_insert on public.event_photos;
create policy ev_photos_insert on public.event_photos for insert to authenticated with check (public.events_can_edit(event_id));
drop policy if exists ev_photos_update on public.event_photos;
create policy ev_photos_update on public.event_photos for update to authenticated
  using (public.events_can_edit(event_id)) with check (public.events_can_edit(event_id));
drop policy if exists ev_photos_delete on public.event_photos;
create policy ev_photos_delete on public.event_photos for delete to authenticated using (public.events_can_edit(event_id));

drop policy if exists ev_settings_select on public.event_settings;
create policy ev_settings_select on public.event_settings for select to authenticated using (true);
drop policy if exists ev_settings_update on public.event_settings;
create policy ev_settings_update on public.event_settings for update to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

-- ---------------------------------------------------------------- gallery image files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists ev_files_select on storage.objects;
create policy ev_files_select on storage.objects for select to authenticated
  using (bucket_id = 'event-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists ev_files_insert on storage.objects;
create policy ev_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists ev_files_update on storage.objects;
create policy ev_files_update on storage.objects for update to authenticated
  using (bucket_id = 'event-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists ev_files_delete on storage.objects;
create policy ev_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));

-- ---------------------------------------------------------------- starter categories (the admin can add / edit / remove)
insert into public.event_categories (name, icon, sort_order) values
  ('Function Halls', '🏛️', 10), ('Catering', '🍽️', 20), ('Wedding Planner', '💍', 30), ('Birthday Planner', '🎂', 40),
  ('Decoration & Flowers', '💐', 50), ('Photography & Video', '📸', 60), ('DJ & Sound', '🎧', 70), ('Makeup Artist', '💄', 80),
  ('Mehendi Artist', '🌿', 90), ('Tent House', '⛺', 100), ('Cake & Bakery', '🍰', 110), ('Priest / Pandit', '🪔', 120),
  ('Anchor / MC', '🎤', 130), ('Band & Baraat', '🥁', 140), ('Lighting & Stage', '💡', 150), ('Wedding Cards', '💌', 160),
  ('Return Gifts', '🎁', 170), ('Car Rental', '🚗', 180), ('Bridal Wear & Jewellery', '👗', 190), ('Kids Entertainment', '🎪', 200)
on conflict do nothing;
