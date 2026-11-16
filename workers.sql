-- =====================================================================
--  WORKERS DIRECTORY  -  run ONCE in Supabase > SQL Editor
--  (needs matrimony.sql already run, because it reuses matrimony_is_admin()).
--  Creates only new objects prefixed "worker". Safe to re-run.
--
--  * Workers: name, phone, address, work type, optional photo.
--  * A worker's number is visible to other users ONLY when the admin has approved
--    the worker AND the admin's "show all contacts" switch is ON.
--  * The admin adds / edits / deletes everything and manages the work-type menu.
-- =====================================================================

-- ---------------------------------------------------------------- work types (the menu the admin controls)
create table if not exists public.worker_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 40),
  icon       text not null default '🛠️',
  sort_order int  not null default 100,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists worker_types_name_uni on public.worker_types (lower(name));

-- ---------------------------------------------------------------- workers
create table if not exists public.workers (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users(id) on delete set null,   -- empty when the admin added the worker
  name             text not null check (char_length(name) between 2 and 80),
  work_type_id     uuid not null references public.worker_types(id) on delete restrict,
  address          text,
  about            text,
  experience_years int check (experience_years between 0 and 70),
  photo_path       text,
  hide_phone       boolean not null default false,                      -- admin can hide one worker's number
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists workers_status_idx on public.workers (status, work_type_id);
create unique index if not exists workers_owner_uni on public.workers (owner_id) where owner_id is not null;

-- phone numbers live in their own table so they can be hidden
create table if not exists public.worker_contacts (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  phone     text not null check (phone ~ '^\+?[0-9]{10,15}$')
);

-- one row of settings: the admin's "show / hide all contacts" switch
create table if not exists public.worker_settings (
  id            int primary key default 1 check (id = 1),
  show_contacts boolean not null default true,
  updated_at    timestamptz not null default now()
);
insert into public.worker_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- helpers + guard
create or replace function public.workers_can_edit(wid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.matrimony_is_admin()
      or exists (select 1 from public.workers w where w.id = wid and w.owner_id = auth.uid());
$$;

-- a phone number is visible to: the admin, the worker himself, or everyone IF the worker is approved and contacts are switched on
create or replace function public.workers_can_see_contact(wid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.workers_can_edit(wid)
      or (exists (select 1 from public.worker_settings s where s.id = 1 and s.show_contacts)
          and exists (select 1 from public.workers w where w.id = wid and w.status = 'approved' and not w.hide_phone));
$$;

-- only the admin can approve; everyone else's new listing starts as pending
create or replace function public.workers_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.matrimony_is_admin() then new.status := 'pending'; new.owner_id := auth.uid(); new.hide_phone := false; end if;
  else
    if not public.matrimony_is_admin() then new.status := old.status; new.owner_id := old.owner_id; new.hide_phone := old.hide_phone; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists workers_guard_trg on public.workers;
create trigger workers_guard_trg before insert or update on public.workers
  for each row execute function public.workers_guard();

-- ---------------------------------------------------------------- row level security
alter table public.worker_types    enable row level security;
alter table public.workers         enable row level security;
alter table public.worker_contacts enable row level security;
alter table public.worker_settings enable row level security;

drop policy if exists wk_types_select on public.worker_types;
create policy wk_types_select on public.worker_types for select to authenticated using (active or public.matrimony_is_admin());
drop policy if exists wk_types_admin on public.worker_types;
create policy wk_types_admin on public.worker_types for all to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

drop policy if exists wk_workers_select on public.workers;
create policy wk_workers_select on public.workers for select to authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.matrimony_is_admin());
drop policy if exists wk_workers_insert on public.workers;
create policy wk_workers_insert on public.workers for insert to authenticated
  with check (public.matrimony_is_admin() or owner_id = auth.uid());
drop policy if exists wk_workers_update on public.workers;
create policy wk_workers_update on public.workers for update to authenticated
  using (public.matrimony_is_admin() or owner_id = auth.uid())
  with check (public.matrimony_is_admin() or owner_id = auth.uid());
drop policy if exists wk_workers_delete on public.workers;
create policy wk_workers_delete on public.workers for delete to authenticated using (public.matrimony_is_admin());

drop policy if exists wk_contacts_select on public.worker_contacts;
create policy wk_contacts_select on public.worker_contacts for select to authenticated using (public.workers_can_see_contact(worker_id));
drop policy if exists wk_contacts_insert on public.worker_contacts;
create policy wk_contacts_insert on public.worker_contacts for insert to authenticated with check (public.workers_can_edit(worker_id));
drop policy if exists wk_contacts_update on public.worker_contacts;
create policy wk_contacts_update on public.worker_contacts for update to authenticated
  using (public.workers_can_edit(worker_id)) with check (public.workers_can_edit(worker_id));
drop policy if exists wk_contacts_delete on public.worker_contacts;
create policy wk_contacts_delete on public.worker_contacts for delete to authenticated using (public.matrimony_is_admin());

drop policy if exists wk_settings_select on public.worker_settings;
create policy wk_settings_select on public.worker_settings for select to authenticated using (true);
drop policy if exists wk_settings_update on public.worker_settings;
create policy wk_settings_update on public.worker_settings for update to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

-- ---------------------------------------------------------------- photos (optional)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worker-photos', 'worker-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists wk_photos_select on storage.objects;
create policy wk_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'worker-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists wk_photos_insert on storage.objects;
create policy wk_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'worker-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists wk_photos_update on storage.objects;
create policy wk_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'worker-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));
drop policy if exists wk_photos_delete on storage.objects;
create policy wk_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'worker-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.matrimony_is_admin()));

-- ---------------------------------------------------------------- starter work types (the admin can add / edit / remove)
insert into public.worker_types (name, icon, sort_order) values
  ('Plumber', '🚰', 10), ('Electrician', '⚡', 20), ('Carpenter', '🪚', 30), ('POP Worker', '🏗️', 40),
  ('Painter', '🎨', 50), ('Mason', '🧱', 60), ('Tiles Worker', '🔲', 70), ('Welder', '🔥', 80),
  ('AC Mechanic', '❄️', 90), ('Mechanic', '🔧', 100), ('Driver', '🚗', 110), ('Gardener', '🌿', 120),
  ('Cleaner', '🧹', 130), ('Cook', '👨‍🍳', 140), ('Tailor', '🧵', 150), ('Labour', '💪', 160)
on conflict do nothing;
