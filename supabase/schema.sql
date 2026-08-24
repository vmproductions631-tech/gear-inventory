-- vmp-gear-inventory — database schema
--
-- Run this once against a fresh Supabase project (SQL Editor, or
-- `supabase db execute -f supabase/schema.sql`) before starting the app.
--
-- Access control lives here, not in the application. Every table is
-- RLS-protected by a single policy that calls app_private.is_operator();
-- the client only ever holds the anon key, so an unauthenticated or
-- non-allowlisted session sees nothing regardless of what the UI does.

-- ---------------------------------------------------------------- operators
-- Edit this list to grant access. SECURITY DEFINER with an empty search_path
-- so it cannot be shadowed by a caller-controlled schema.
create schema if not exists app_private;

create or replace function app_private.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in ('you@example.com', 'teammate@example.com'),
    false
  );
$$;

-- -------------------------------------------------------------------- types
create type item_status as enum (
  'in_storage',
  'with_owner',
  'with_operator',
  'with_crew',
  'rented_out',
  'out_other',
  'retired'
);

-- ------------------------------------------------------------------- tables
create table people (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz not null default now()
);

create table rentals (
  id             uuid primary key default gen_random_uuid(),
  client_name    text not null,
  client_contact text,
  date_out       date not null,
  date_due       date not null,
  date_returned  date,
  notes          text,
  created_at     timestamptz not null default now()
);

create table kits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  photo_path  text,
  rental_rate numeric,
  notes       text,
  created_at  timestamptz not null default now()
);

create table items (
  id                 uuid primary key default gen_random_uuid(),
  short_code         text not null unique,
  name               text not null,
  category           text not null
                       check (category in ('camera','lens','audio','lighting',
                                           'grip','cables_power','other')),
  photo_path         text,
  status             item_status not null default 'in_storage',
  assigned_person_id uuid references people(id) on delete set null,
  rental_id          uuid references rentals(id) on delete set null,
  status_note        text,
  purchase_price     numeric,
  replacement_value  numeric,
  rental_rate        numeric,
  owner              text not null
                       check (owner in ('owner','operator','assistant')),
  kit_id             uuid references kits(id) on delete set null,
  notes              text,
  retired_reason     text check (retired_reason in ('sold','lost','broken','other')),
  retired_note       text,
  retired_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table loadouts (
  id                 uuid primary key default gen_random_uuid(),
  name               text,
  destination_status item_status not null,
  person_id          uuid references people(id) on delete set null,
  rental_id          uuid references rentals(id) on delete set null,
  status             text not null default 'draft'
                       check (status in ('draft','open','closed')),
  created_by         text,
  checked_out_at     timestamptz,
  closed_at          timestamptz,
  created_at         timestamptz not null default now()
);

create table loadout_items (
  id         uuid primary key default gen_random_uuid(),
  loadout_id uuid not null references loadouts(id) on delete cascade,
  item_id    uuid not null references items(id)    on delete cascade,
  returned_at timestamptz,
  resolution text check (resolution in ('returned','retired')),
  unique (loadout_id, item_id)
);

-- Append-only audit trail: every status transition, who made it, and why.
create table status_log (
  id         bigint generated always as identity primary key,
  item_id    uuid not null references items(id) on delete cascade,
  old_status item_status,
  new_status item_status not null,
  person_id  uuid references people(id) on delete set null,
  rental_id  uuid references rentals(id) on delete set null,
  note       text,
  changed_by text not null,
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------- RLS
alter table people        enable row level security;
alter table rentals       enable row level security;
alter table kits          enable row level security;
alter table items         enable row level security;
alter table loadouts      enable row level security;
alter table loadout_items enable row level security;
alter table status_log    enable row level security;

create policy operators_all on people        for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on rentals       for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on kits          for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on items         for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on loadouts      for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on loadout_items for all using (app_private.is_operator()) with check (app_private.is_operator());
create policy operators_all on status_log    for all using (app_private.is_operator()) with check (app_private.is_operator());

-- ------------------------------------------------------------------ storage
-- Item and kit photos. Private: the app resolves paths to short-lived signed
-- URLs rather than serving public links.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "operators read photos"   on storage.objects for select
  using (bucket_id = 'photos' and app_private.is_operator());
create policy "operators write photos"  on storage.objects for insert
  with check (bucket_id = 'photos' and app_private.is_operator());
create policy "operators delete photos" on storage.objects for delete
  using (bucket_id = 'photos' and app_private.is_operator());
