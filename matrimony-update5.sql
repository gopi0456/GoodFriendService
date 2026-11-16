-- =====================================================================
--  MATRIMONIAL UPDATE 5  -  run ONCE in Supabase > SQL Editor
--  (after matrimony-update4.sql). Safe to re-run.
--
--  * Users can edit their own profile but can NOT delete it.
--  * Only the main admin (scgopi.gopi@gmail.com) can delete profiles.
-- =====================================================================
drop policy if exists mm_profiles_delete on public.matrimony_profiles;
create policy mm_profiles_delete on public.matrimony_profiles for delete to authenticated
  using (public.matrimony_is_admin());

drop policy if exists mm_contacts_delete on public.matrimony_contacts;
create policy mm_contacts_delete on public.matrimony_contacts for delete to authenticated
  using (public.matrimony_is_admin());
