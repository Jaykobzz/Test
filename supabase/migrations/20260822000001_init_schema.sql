-- FRIEND — grundschema
-- Hitta folk i närheten som vill umgås och göra saker tillsammans.
--
-- Designprinciper som återkommer i hela schemat:
--   1. Personnummer lagras ALDRIG i klartext. Endast en pepprad hash, för att
--      kunna känna igen en återvändande person utan att kunna läsa numret.
--   2. Exakt hemposition är privat. Andra ser bara ett områdesnamn och ett
--      avståndsspann — aldrig råa koordinater.
--   3. Trygghetssignaler ("kändes inte trygg") är separerade från det publika
--      stjärnbetyget, så att de inte kan användas som offentligt gapstock.

create schema if not exists extensions;
create extension if not exists "postgis"  with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Uppräkningar
-- ---------------------------------------------------------------------------

create type activity_visibility as enum ('public', 'bff');
create type activity_status     as enum ('draft', 'open', 'full', 'cancelled', 'completed');
create type join_status         as enum ('pending', 'accepted', 'declined', 'withdrawn', 'removed');
create type thread_kind         as enum ('activity', 'direct');
create type message_kind        as enum ('text', 'image', 'place', 'list', 'system');
create type friendship_status   as enum ('pending', 'accepted', 'declined');
create type report_status       as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Intressekatalog
-- ---------------------------------------------------------------------------

create table interests (
  slug        text primary key,
  label       text not null,
  emoji       text not null,
  sort_order  int  not null default 100
);

comment on table interests is
  'Kanonisk lista över intressen. Profiler och aktiviteter refererar till slugs.';

-- ---------------------------------------------------------------------------
-- Profiler
-- ---------------------------------------------------------------------------

create table profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,

  -- BankID-verifierad identitet
  personal_number_hash  text not null unique,
  legal_given_name      text not null,
  legal_family_name     text not null,
  birth_year            int  not null,
  verified_at           timestamptz not null default now(),

  -- Det användaren själv styr över
  display_name          text not null check (length(btrim(display_name)) between 2 and 40),
  bio                   text check (length(bio) <= 500),
  avatar_url            text not null,                -- bildkrav: ingen profil utan bild
  interests             text[] not null default '{}',

  -- Var man bor. Koordinaterna är privata, area_label är det andra ser.
  home_lat              double precision,
  home_lng              double precision,
  home_area_label       text,
  home_geog             extensions.geography(Point, 4326)
                          generated always as (
                            case
                              when home_lat is null or home_lng is null then null
                              else extensions.st_setsrid(extensions.st_makepoint(home_lng, home_lat), 4326)::extensions.geography
                            end
                          ) stored,

  -- Konto
  is_suspended          boolean not null default false,
  suspended_reason      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint avatar_required check (length(btrim(avatar_url)) > 0),
  constraint birth_year_sane check (birth_year between 1900 and extract(year from now())::int)
);

create index profiles_home_geog_idx  on profiles using gist (home_geog);
create index profiles_interests_idx  on profiles using gin  (interests);

comment on column profiles.personal_number_hash is
  'HMAC-SHA256 av personnumret med en serverhemlighet. Aldrig reversibelt, aldrig exponerat mot klient.';
comment on column profiles.home_lat is
  'Privat. Exponeras aldrig direkt — endast som avstånd via public_profiles.';

-- ---------------------------------------------------------------------------
-- Aktiviteter
-- ---------------------------------------------------------------------------

create table activities (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references profiles (id) on delete cascade,

  title           text not null check (length(btrim(title)) between 3 and 80),
  description     text check (length(description) <= 2000),
  category        text references interests (slug),
  cover_url       text not null,                      -- bildkrav: ingen aktivitet utan bild

  -- Var
  location_name   text not null,                      -- "Drevviken, Skarpnäck"
  lat             double precision not null,
  lng             double precision not null,
  geog            extensions.geography(Point, 4326)
                    generated always as (
                      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                    ) stored,

  -- När
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,

  -- Vem
  visibility      activity_visibility not null default 'public',
  capacity        int check (capacity is null or capacity between 1 and 200),
  min_rating      numeric(3,2) check (min_rating is null or min_rating between 1 and 5),
  min_age         int check (min_age is null or min_age between 15 and 120),

  status          activity_status not null default 'open',
  cancelled_reason text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint cover_required check (length(btrim(cover_url)) > 0),
  constraint ends_after_start check (ends_at > starts_at),
  constraint lat_valid check (lat between -90 and 90),
  constraint lng_valid check (lng between -180 and 180)
);

create index activities_geog_idx      on activities using gist (geog);
create index activities_starts_at_idx on activities (starts_at);
create index activities_host_idx      on activities (host_id);
create index activities_status_idx    on activities (status) where status = 'open';

comment on column activities.visibility is
  'public = syns för alla i närheten. bff = syns bara för värdens accepterade BFF:s.';
comment on column activities.min_rating is
  'Frivilligt filter: värden kan kräva ett minsta snittbetyg för att få ansöka.';

-- ---------------------------------------------------------------------------
-- Ansökningar om att haka på
-- ---------------------------------------------------------------------------

create table activity_participants (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,

  status        join_status not null default 'pending',
  intro_message text check (length(intro_message) <= 500),

  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references profiles (id) on delete set null,

  unique (activity_id, user_id)
);

create index activity_participants_activity_idx on activity_participants (activity_id, status);
create index activity_participants_user_idx     on activity_participants (user_id, status);

-- ---------------------------------------------------------------------------
-- Chatt
-- ---------------------------------------------------------------------------

create table threads (
  id           uuid primary key default gen_random_uuid(),
  kind         thread_kind not null,
  activity_id  uuid unique references activities (id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  last_message_at timestamptz not null default now(),

  -- En aktivitetstråd måste ha en aktivitet; en direktchatt får inte ha en.
  constraint activity_thread_shape check (
    (kind = 'activity' and activity_id is not null) or
    (kind = 'direct'   and activity_id is null)
  )
);

create index threads_last_message_idx on threads (last_message_at desc);

create table thread_members (
  thread_id    uuid not null references threads (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted        boolean not null default false,
  primary key (thread_id, user_id)
);

create index thread_members_user_idx on thread_members (user_id);

create table messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references threads (id) on delete cascade,
  sender_id   uuid references profiles (id) on delete set null,

  kind        message_kind not null default 'text',
  body        text,                       -- text, bildtext, platsnamn eller listrubrik
  image_url   text,                       -- kind = 'image'
  lat         double precision,           -- kind = 'place'
  lng         double precision,
  payload     jsonb,                      -- kind = 'list': {"items":[{"id","text","checked_by"}]}

  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz,

  constraint message_shape check (
    case kind
      when 'text'  then body is not null and length(btrim(body)) > 0
      when 'image' then image_url is not null
      when 'place' then lat is not null and lng is not null
      when 'list'  then payload is not null
      when 'system' then body is not null
    end
  )
);

create index messages_thread_idx on messages (thread_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stjärnor
-- ---------------------------------------------------------------------------

create table ratings (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities (id) on delete cascade,
  rater_id      uuid not null references profiles (id) on delete cascade,
  ratee_id      uuid not null references profiles (id) on delete cascade,

  fun           smallint not null check (fun between 1 and 5),          -- hur kul var det
  friendliness  smallint not null check (friendliness between 1 and 5), -- hur trevlig
  felt_safe     boolean  not null,                                      -- kändes det tryggt
  comment       text check (length(comment) <= 500),

  created_at    timestamptz not null default now(),

  unique (activity_id, rater_id, ratee_id),
  constraint no_self_rating check (rater_id <> ratee_id)
);

create index ratings_ratee_idx on ratings (ratee_id);

comment on table ratings is
  'Ett betyg per person per aktivitet. felt_safe = false lämnar aldrig servern som '
  'publik siffra — den går till trygghetskön i safety_flags.';

-- Trygghetslarm, avskilt från det publika betyget. Endast moderation läser detta.
create table safety_flags (
  id           uuid primary key default gen_random_uuid(),
  rating_id    uuid unique references ratings (id) on delete cascade,
  flagged_user uuid not null references profiles (id) on delete cascade,
  raised_by    uuid not null references profiles (id) on delete cascade,
  activity_id  uuid references activities (id) on delete set null,
  note         text,
  status       report_status not null default 'open',
  created_at   timestamptz not null default now()
);

create index safety_flags_user_idx on safety_flags (flagged_user, status);

-- ---------------------------------------------------------------------------
-- BFF
-- ---------------------------------------------------------------------------

create table friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles (id) on delete cascade,
  addressee_id  uuid not null references profiles (id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,

  constraint no_self_friendship check (requester_id <> addressee_id),
  -- Ett par kan bara ha en relation, oavsett vem som frågade först.
  constraint friendship_pair_unique
    unique (requester_id, addressee_id)
);

-- Hindra spegelvänd dubblett (A→B och B→A samtidigt).
create unique index friendships_canonical_pair_idx on friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create index friendships_addressee_idx on friendships (addressee_id, status);
create index friendships_requester_idx on friendships (requester_id, status);

-- ---------------------------------------------------------------------------
-- Trygghet: blockering och anmälan
-- ---------------------------------------------------------------------------

create table blocks (
  blocker_id  uuid not null references profiles (id) on delete cascade,
  blocked_id  uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on blocks (blocked_id);

create table reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references profiles (id) on delete cascade,
  reported_user_id uuid references profiles (id) on delete cascade,
  activity_id      uuid references activities (id) on delete set null,
  message_id       uuid references messages (id) on delete set null,
  reason           text not null,
  details          text,
  status           report_status not null default 'open',
  created_at       timestamptz not null default now()
);
