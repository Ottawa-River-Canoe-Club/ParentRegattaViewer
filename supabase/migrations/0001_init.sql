-- RegattaParent: regattas directory + admin authorization
--
-- SECURITY MODEL
-- The app's client-side "Unauthorized" screen is a UX nicety only — the
-- browser's Supabase anon key is public by design, so the real access
-- control boundary is the Row Level Security (RLS) policies below, enforced
-- by Postgres itself regardless of what the client tries to do.
--
-- An admin is anyone whose auth email either:
--   (a) ends in @orcc.ca, or
--   (b) has a row in allowed_admins
-- is_admin() is SECURITY DEFINER so it can check allowed_admins internally
-- even for callers who aren't themselves allowed to SELECT that table.

create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists citext;   -- case-insensitive email comparisons

create table if not exists public.regattas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  -- Extracted Google Sheet ID (not a full URL, despite the column name —
  -- the admin form parses the pasted URL down to this before saving).
  sheet_url text not null,
  -- Extracted gid of the draw/results tab; the schedule tab is always the
  -- default export (no gid), matching the live app's existing convention.
  results_gid text not null default '0',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.allowed_admins (
  email citext primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() ->> 'email', '') ilike '%@orcc.ca'
    or exists (
      select 1 from public.allowed_admins
      where email = (auth.jwt() ->> 'email')
    );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.regattas enable row level security;
alter table public.allowed_admins enable row level security;

-- regattas: anyone can browse the directory (including archived — the
-- public directory has its own toggle for that); only admins can write.
create policy "Public can view regattas"
  on public.regattas for select
  to anon, authenticated
  using (true);

create policy "Admins can insert regattas"
  on public.regattas for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update regattas"
  on public.regattas for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- allowed_admins: never publicly readable or writable — only existing
-- admins can view or extend the list (checked via is_admin(), not a plain
-- self-row policy, so the whole list can be shown in the Admin Portal).
create policy "Admins can view allowed_admins"
  on public.allowed_admins for select
  to authenticated
  using (public.is_admin());

create policy "Admins can add allowed_admins"
  on public.allowed_admins for insert
  to authenticated
  with check (public.is_admin());
