-- =====================================================================
--  APP UPDATE 2C  (part 3 of 3)  -  phone tokens (only needed for phone notifications, see PUSH-SETUP.md)
--  Run it ONCE, after 2B. Safe to run again.
-- =====================================================================

create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;     -- no policies: only the function below and the push Edge Function (service role) touch it

create or replace function public.register_push_token(p_token text, p_platform text default 'android') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at) values (p_token, auth.uid(), coalesce(p_platform, 'android'), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
grant execute on function public.register_push_token(text, text) to authenticated;

-- check: this should show a table name, not null
select to_regclass('public.push_tokens') as push_tokens_created;
