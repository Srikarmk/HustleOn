-- HustleOn — lock down the AI rate-limit RPC.
-- Run in the Supabase SQL Editor after 0002_production.sql. Idempotent.

-- ---------------------------------------------------------------------------
-- `increment_ai_usage` is SECURITY DEFINER and takes the user id as an
-- argument. Postgres grants EXECUTE on new functions to PUBLIC by default, so
-- any signed-in client could call it with *someone else's* user id and burn
-- through that person's daily AI quota (a cheap denial of service against
-- another account).
--
-- Only the Edge Function needs it, and that runs as the service role, which
-- bypasses these grants. So revoke EXECUTE from everyone else.
-- ---------------------------------------------------------------------------
revoke all on function public.increment_ai_usage(uuid) from public;
revoke all on function public.increment_ai_usage(uuid) from anon;
revoke all on function public.increment_ai_usage(uuid) from authenticated;

-- Defence in depth: ignore the caller-supplied id entirely when the function is
-- invoked by an end user, and pin the search_path (already set in 0002, kept
-- here so this migration is self-contained if replayed).
create or replace function public.increment_ai_usage(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  target_user uuid;
begin
  -- When called with a JWT (auth.uid() is set), only ever meter that caller.
  -- The service role has no auth.uid(), so the Edge Function keeps working.
  target_user := coalesce(auth.uid(), p_user_id);
  if target_user is null then
    raise exception 'increment_ai_usage: no user id';
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (target_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- `create or replace` re-grants EXECUTE to PUBLIC, so revoke again afterwards.
revoke all on function public.increment_ai_usage(uuid) from public;
revoke all on function public.increment_ai_usage(uuid) from anon;
revoke all on function public.increment_ai_usage(uuid) from authenticated;
