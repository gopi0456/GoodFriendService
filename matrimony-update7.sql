-- =====================================================================
--  MATRIMONIAL UPDATE 7  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update6.sql). Safe to re-run.
--
--  * Caste category (OC / BC / SC / ST) next to the caste / sub-caste.
--  * Full details of other profiles are shown ONLY to viewers the admin has approved.
--  * Dashboard: registration counts + "successfully completed" (married) couples.
-- =====================================================================

-- ---------------------------------------------------------------- caste category
alter table public.matrimony_profiles add column if not exists caste_category text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matrimony_caste_category_chk') then
    alter table public.matrimony_profiles
      add constraint matrimony_caste_category_chk check (caste_category is null or caste_category in ('OC','BC','SC','ST'));
  end if;
end $$;

-- ---------------------------------------------------------------- new profile status: married
alter table public.matrimony_profiles drop constraint if exists matrimony_profiles_status_check;
alter table public.matrimony_profiles
  add constraint matrimony_profiles_status_check check (status in ('pending','approved','rejected','married'));

-- ---------------------------------------------------------------- success stories (completed matches)
create table if not exists public.matrimony_success (
  id          uuid primary key default gen_random_uuid(),
  groom_id    uuid references auth.users(id) on delete set null,
  bride_id    uuid references auth.users(id) on delete set null,
  groom_name  text not null,
  bride_name  text not null,
  groom_photo text,
  bride_photo text,
  married_on  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.matrimony_success enable row level security;

drop policy if exists mm_success_select on public.matrimony_success;
create policy mm_success_select on public.matrimony_success for select to authenticated using (true);
drop policy if exists mm_success_insert on public.matrimony_success;
create policy mm_success_insert on public.matrimony_success for insert to authenticated
  with check (public.matrimony_has_perm('review'));
drop policy if exists mm_success_update on public.matrimony_success;
create policy mm_success_update on public.matrimony_success for update to authenticated
  using (public.matrimony_has_perm('review')) with check (public.matrimony_has_perm('review'));
drop policy if exists mm_success_delete on public.matrimony_success;
create policy mm_success_delete on public.matrimony_success for delete to authenticated
  using (public.matrimony_has_perm('review'));

-- ---------------------------------------------------------------- dashboard counts
create or replace function public.matrimony_stats()
returns table (total bigint, male bigint, female bigint, couples bigint)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where status in ('pending','approved','married')),
    count(*) filter (where status in ('pending','approved','married') and gender = 'male'),
    count(*) filter (where status in ('pending','approved','married') and gender = 'female'),
    (select count(*) from public.matrimony_success)
  from public.matrimony_profiles;
$$;
revoke all on function public.matrimony_stats() from public, anon;
grant execute on function public.matrimony_stats() to authenticated;

-- ---------------------------------------------------------------- directory view
-- Details are returned only when BOTH the profile AND the viewer are approved.
drop view if exists public.matrimony_directory;
create view public.matrimony_directory as
select
  p.user_id, p.full_name, p.gender,
  extract(year from age(p.dob))::int as age,
  p.education, p.photo_path, p.status,
  case when p.status = 'approved' and me.status = 'approved' then p.caste_category end         as caste_category,
  case when p.status = 'approved' and me.status = 'approved' then p.height_cm end              as height_cm,
  case when p.status = 'approved' and me.status = 'approved' then p.marital_status end         as marital_status,
  case when p.status = 'approved' and me.status = 'approved' then p.religion end               as religion,
  case when p.status = 'approved' and me.status = 'approved' then p.caste end                  as caste,
  case when p.status = 'approved' and me.status = 'approved' then p.mother_tongue end          as mother_tongue,
  case when p.status = 'approved' and me.status = 'approved' then p.occupation end             as occupation,
  case when p.status = 'approved' and me.status = 'approved' then p.annual_income end          as annual_income,
  case when p.status = 'approved' and me.status = 'approved' then p.city end                   as city,
  case when p.status = 'approved' and me.status = 'approved' then p.state end                  as state,
  case when p.status = 'approved' and me.status = 'approved' then p.about end                  as about,
  case when p.status = 'approved' and me.status = 'approved' then p.partner_expectations end   as partner_expectations,
  p.moon_long,
  case when p.religion is null or me.religion is null then null
       when lower(p.religion) = lower(me.religion) then 'same' else 'diff' end            as cmp_religion,
  case when p.mother_tongue is null or me.mother_tongue is null then null
       when lower(p.mother_tongue) = lower(me.mother_tongue) then 'same' else 'diff' end  as cmp_tongue,
  case when p.caste is null or me.caste is null then null
       when lower(p.caste) = lower(me.caste) then 'same' else 'diff' end                  as cmp_caste,
  case when p.city is null or me.city is null then null
       when lower(p.city) = lower(me.city) then 'city'
       when p.state is not null and me.state is not null and lower(p.state) = lower(me.state) then 'state'
       else 'far' end                                                                     as cmp_location,
  case when p.marital_status is null or me.marital_status is null then null
       when p.marital_status = 'awaiting_divorce' or me.marital_status = 'awaiting_divorce' then 'awaiting'
       when p.marital_status = 'never_married' and me.marital_status = 'never_married' then 'both_never'
       when p.marital_status = me.marital_status then 'same' else 'diff' end              as cmp_marital,
  case when p.height_cm is null or me.height_cm is null then null
       when p.height_cm - me.height_cm < -5 then -2
       when p.height_cm - me.height_cm < 0  then -1
       when p.height_cm - me.height_cm = 0  then 0
       when p.height_cm - me.height_cm <= 5 then 1
       else 2 end                                                                         as cmp_height,
  p.created_at
from public.matrimony_profiles p
join public.matrimony_profiles me on me.user_id = auth.uid()
where p.status in ('pending','approved');

revoke all on public.matrimony_directory from anon;
grant select on public.matrimony_directory to authenticated;
