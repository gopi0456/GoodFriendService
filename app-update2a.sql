-- =====================================================================
--  APP UPDATE 2A  (part 1 of 3)  -  the scrolling update / news banner
--  Run it ONCE in Supabase > SQL Editor. Safe to run again.
--  Tip: clear the editor first, paste this whole file, then tap Run.
-- =====================================================================

create table if not exists public.app_notices (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'update',
  version text,
  message text not null,
  download_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_notices_rules_chk') then
    alter table public.app_notices add constraint app_notices_rules_chk check (
      kind in ('update', 'notice')
      and char_length(btrim(message)) between 3 and 220
      and (version is null or version ~ '^[0-9]+(\.[0-9]+){0,3}$')
      and (download_url is null or download_url ~* '^https://')
      and (kind <> 'update' or (version is not null and download_url is not null))
    );
  end if;
end
$$;

create index if not exists app_notices_idx on public.app_notices (active, created_at desc);

alter table public.app_notices enable row level security;

drop policy if exists notices_select on public.app_notices;
create policy notices_select on public.app_notices for select to authenticated
  using (active or public.matrimony_is_admin());

drop policy if exists notices_admin on public.app_notices;
create policy notices_admin on public.app_notices for all to authenticated
  using (public.matrimony_is_admin()) with check (public.matrimony_is_admin());

-- check: this should show a table name, not null
select to_regclass('public.app_notices') as app_notices_created;
