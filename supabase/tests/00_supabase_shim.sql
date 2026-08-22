-- Minimal Supabase-attrapp så att migrationerna kan köras mot en vanlig
-- Postgres i CI eller lokalt. Skapar de roller, scheman och funktioner som
-- Supabase annars tillhandahåller. Körs ALDRIG i skarp miljö — där finns
-- allt det här redan.

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public, extensions to anon, authenticated, service_role;

-- Supabase ger nya tabeller i public rättigheter automatiskt via default
-- privileges. Migrationerna räknar med det (de gör t.ex. `revoke update on
-- profiles` och delar sedan ut kolumnrättigheter), så attrappen måste göra
-- samma sak för att spegla verkligheten.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- auth.uid() läser samma request-inställning som Supabase sätter per anrop.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid
);

alter table storage.objects enable row level security;

-- Delar upp en objektsökväg i mappnivåer, precis som Supabase gör.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
