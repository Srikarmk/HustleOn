-- HustleOn — Phase 2 cloud sync schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- Helper: auto-touch updated_at on row writes
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: per-user singleton. `data` holds the user profile + scalar
-- settings (privacy, theme, notification prefs, integrations, goals scalars).
-- `data_updated_at` is the whole-account sync clock (last-write-wins).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  data_updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Per-type collection tables. One row per entity; payload in `data` jsonb.
-- Composite PK (user_id, id) — app ids are client-generated strings.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  collection_tables text[] := array[
    'workouts', 'meals', 'bmi_records', 'body_measurements',
    'goals', 'friends', 'supplements', 'progress_photos'
  ];
begin
  foreach t in array collection_tables loop
    execute format($f$
      create table if not exists public.%I (
        user_id uuid not null references auth.users(id) on delete cascade,
        id text not null,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (user_id, id)
      );
    $f$, t);

    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_owner', t);
    execute format($f$
      create policy %I on public.%I
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t || '_owner', t);

    execute format('drop trigger if exists %I on public.%I;', 'set_' || t || '_updated_at', t);
    execute format($f$
      create trigger %I before insert or update on public.%I
        for each row execute function public.set_updated_at();
    $f$, 'set_' || t || '_updated_at', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for progress photos + profile pictures.
-- Files are stored under a per-user folder: <user_id>/<filename>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do nothing;

drop policy if exists "progress_photos_owner_select" on storage.objects;
create policy "progress_photos_owner_select" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos_owner_insert" on storage.objects;
create policy "progress_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos_owner_update" on storage.objects;
create policy "progress_photos_owner_update" on storage.objects
  for update using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos_owner_delete" on storage.objects;
create policy "progress_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
