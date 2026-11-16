-- =====================================================================
--  MATRIMONIAL UPDATE 4  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update3.sql). Safe to re-run.
--
--  Horoscope matching. Birth time / place stay PRIVATE (owner + admin/staff only).
--  Others only get the Moon's position (moon_long) of APPROVED profiles, which gives
--  Moon sign + nakshatra - enough for Guna Milan, not enough to see the birth time.
-- =====================================================================
alter table public.matrimony_profiles
  add column if not exists birth_time       time,
  add column if not exists birth_place      text,
  add column if not exists birth_utc_offset numeric(4,2) not null default 5.5,
  add column if not exists moon_long        numeric(8,5);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matrimony_moon_long_range') then
    alter table public.matrimony_profiles
      add constraint matrimony_moon_long_range check (moon_long is null or (moon_long >= 0 and moon_long < 360));
  end if;
end $$;

-- directory view again, now with moon_long (approved profiles only)
drop view if exists public.matrimony_directory;
create view public.matrimony_directory as
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
  case when p.status = 'approved' then p.moon_long end              as moon_long,
  p.created_at
from public.matrimony_profiles p
where p.status in ('pending','approved')
  and public.matrimony_has_profile();

revoke all on public.matrimony_directory from anon;
grant select on public.matrimony_directory to authenticated;
