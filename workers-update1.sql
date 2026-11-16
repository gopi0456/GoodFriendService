-- =====================================================================
--  WORKERS UPDATE 1  -  run ONCE in Supabase > SQL Editor (after workers.sql). Safe to re-run.
--  The admin can hide ONE worker's phone number (in addition to the "hide all contacts" switch).
-- =====================================================================
alter table public.workers add column if not exists hide_phone boolean not null default false;

create or replace function public.workers_can_see_contact(wid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.workers_can_edit(wid)
      or (exists (select 1 from public.worker_settings s where s.id = 1 and s.show_contacts)
          and exists (select 1 from public.workers w where w.id = wid and w.status = 'approved' and not w.hide_phone));
$$;

-- only the admin can change status / owner / hide_phone
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
