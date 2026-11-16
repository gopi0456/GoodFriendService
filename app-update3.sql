-- =====================================================================
--  APP UPDATE 3  -  run ONCE in Supabase > SQL Editor   (after app-update2a, 2b and 2c). Safe to re-run.
--
--  The admin uploads the new APK from inside the app (Admin > Updates). It is stored in Supabase,
--  every user gets an alert + the scrolling banner, and the Download button points to that file.
-- =====================================================================

-- ---------------------------------------------------------------- 1) a place for the APK files (public download, only the admin can upload)
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-releases', 'app-releases', true, 52428800)            -- 50 MB (the free plan limit)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists apk_select on storage.objects;
create policy apk_select on storage.objects for select to authenticated
  using (bucket_id = 'app-releases' and public.matrimony_is_admin());
drop policy if exists apk_insert on storage.objects;
create policy apk_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'app-releases' and public.matrimony_is_admin());
drop policy if exists apk_update on storage.objects;
create policy apk_update on storage.objects for update to authenticated
  using (bucket_id = 'app-releases' and public.matrimony_is_admin());
drop policy if exists apk_delete on storage.objects;
create policy apk_delete on storage.objects for delete to authenticated
  using (bucket_id = 'app-releases' and public.matrimony_is_admin());

-- ---------------------------------------------------------------- 2) a new kind of alert: "update"
alter table public.app_notifications drop constraint if exists app_notifications_kind_check;
alter table public.app_notifications add constraint app_notifications_kind_check
  check (kind in ('contact', 'chat_message', 'chat_approved', 'admin_reply', 'interest', 'request', 'info', 'update'));

-- ---------------------------------------------------------------- 3) publish: the banner + (optionally) an alert for EVERY user, in one step
create or replace function public.publish_app_notice(p_kind text, p_version text, p_message text, p_url text, p_notify boolean default true)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  if not public.matrimony_is_admin() then raise exception 'Only the admin can publish'; end if;
  if p_kind not in ('update', 'notice') then raise exception 'Unknown kind'; end if;

  insert into public.app_notices (kind, version, message, download_url, active)
  values (p_kind, case when p_kind = 'update' then p_version end, p_message, case when p_kind = 'update' then p_url end, true);

  if p_notify then
    insert into public.app_notifications (user_id, kind, title, body, ref)
    select u.id,
           case when p_kind = 'update' then 'update' else 'info' end,
           case when p_kind = 'update' then 'New update available (v' || p_version || ')' else 'News from Good Friend Service' end,
           left(p_message, 250),
           case when p_kind = 'update' then p_version || '|' || p_url end          -- the app reads "version|download link" from here
    from auth.users u;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;
grant execute on function public.publish_app_notice(text, text, text, text, boolean) to authenticated;
