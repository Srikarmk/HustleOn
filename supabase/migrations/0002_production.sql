-- HustleOn — Phase "production hardening" schema changes.
-- Run in the Supabase SQL Editor after 0001_init.sql. Idempotent.

-- ---------------------------------------------------------------------------
-- 1. Make the progress-photos bucket PRIVATE.
-- Progress/body photos are sensitive; they must not be readable by public URL.
-- The app now uploads to it and reads via short-lived signed URLs.
-- (Owner RLS policies from 0001 still apply to storage.objects.)
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'progress-photos';

-- ---------------------------------------------------------------------------
-- 2. AI usage metering for the gemini-proxy rate limiter.
-- One row per user per UTC day; the Edge Function increments it and rejects
-- calls over the daily cap. Written by the service role in the function.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Users may read their own usage; writes happen via the service role only.
drop policy if exists "ai_usage_owner_select" on public.ai_usage;
create policy "ai_usage_owner_select" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomic increment: bumps today's counter and returns the new value.
create or replace function public.increment_ai_usage(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
