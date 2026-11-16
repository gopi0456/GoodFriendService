-- =====================================================================
--  MATRIMONIAL UPDATE 6  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update5.sql). Safe to re-run.
--
--  Lets every viewer see the match scores of a profile EVEN BEFORE admin approval,
--  while the details stay hidden. How: for pending profiles the view does not return
--  religion / caste / city / height / ... Instead it returns only "same or different
--  as YOU" answers (cmp_*), which is all the score needs.
--  The Moon position (moon_long) is also returned so the horoscope score can be shown.
-- =====================================================================
drop view if exists public.matrimony_directory;
create view public.matrimony_directory as
select
  p.user_id, p.full_name, p.gender,
  extract(year from age(p.dob))::int as age,
  p.education, p.photo_path, p.status,
  -- details: approved profiles only
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
  -- horoscope input (all listed profiles)
  p.moon_long,
  -- comparison with the viewer's own profile (all listed profiles)
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
join public.matrimony_profiles me on me.user_id = auth.uid()   -- the viewer must have a profile
where p.status in ('pending','approved');

revoke all on public.matrimony_directory from anon;
grant select on public.matrimony_directory to authenticated;
