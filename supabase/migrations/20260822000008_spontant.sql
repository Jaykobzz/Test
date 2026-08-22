/*
  Spontana aktiviteter.

  En planerad aktivitet och en spontan är samma data men nästan inget annat.
  Den planerade görs i förväg, tänks igenom och bläddras fram i flödet. Den
  spontana görs på en halv minut i hallen, och det som är ont om är inte
  platser utan uppmärksamhet just nu. Därför måste den komma till folk i
  stället för att hittas, den måste vara gjord på sekunder, och den måste dö
  av sig själv. En spontan inbjudan som ligger kvar sex timmar är skräp.

  Allt nedan följer av det.
*/

create type activity_kind as enum ('planned', 'now');

alter table activities
  add column kind activity_kind not null default 'planned';

/*
  Bildkravet gäller planerade aktiviteter.

  Kravet finns för att flödet ska se levande ut och för att en post ska kosta
  något. Bägge skälen håller för något man lägger upp i förväg. För "fika om
  tjugo minuter" håller inget av dem: att kräva ett foto av en hall är inte
  ett kvalitetskrav, det är ett hinder som gör att posten aldrig blir av.
  Spontana poster får i stället ett omslag ritat ur kategorin, så flödet ser
  likadant ut utan att någon behöver fotografera något.
*/
alter table activities
  drop constraint cover_required;

alter table activities
  alter column cover_url drop not null;

alter table activities
  add constraint cover_required_for_planned check (
    kind = 'now' or (cover_url is not null and length(btrim(cover_url)) > 0)
  );

/*
  Spontant betyder spontant. Utan den här gränsen blir "NU" bara ett andra
  sätt att lägga upp vad som helst, och pushnotisen som hör till skulle
  därmed gälla saker som inte alls är på gång.
*/
alter table activities
  add constraint now_starts_soon check (
    kind <> 'now' or starts_at <= created_at + interval '6 hours'
  );

create index activities_kind_starts_idx on activities (kind, starts_at)
  where status = 'open';

comment on column activities.kind is
  'planned = uppläggd i förväg, now = spontan och kortlivad.';

-- ---------------------------------------------------------------------------
-- Vem som ska få veta
--
-- Att skicka en notis är enkelt. Att låta bli är det som avgör om appen får
-- ligga kvar på telefonen. En app som säger till för ofta stängs av en gång,
-- och då är den tyst för alltid. Därför är varje gräns nedan en gräns uppåt,
-- och den som inte gjort något val får det försiktiga alternativet.
-- ---------------------------------------------------------------------------

create table push_tokens (
  user_id     uuid not null references profiles (id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, token)
);

create table notification_prefs (
  user_id        uuid primary key references profiles (id) on delete cascade,
  -- Av som förval vore ärligare men gör funktionen meningslös; på med snäva
  -- gränser är avvägningen. Allt nedan går att stänga av.
  spontaneous    boolean not null default true,
  radius_km      int not null default 5 check (radius_km between 1 and 25),
  -- Lokala timmar. Utanför fönstret skickas ingenting.
  quiet_from     int not null default 21 check (quiet_from between 0 and 23),
  quiet_to       int not null default 8  check (quiet_to between 0 and 23),
  -- Den hårda gränsen. Fyra om dagen är redan mycket.
  max_per_day    int not null default 4 check (max_per_day between 0 and 20),
  updated_at     timestamptz not null default now()
);

create table notifications_sent (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  sent_at     timestamptz not null default now(),
  unique (user_id, activity_id)          -- samma aktivitet aviseras aldrig två gånger
);

create index notifications_sent_recent_idx on notifications_sent (user_id, sent_at desc);

/*
  Mottagarna för en spontan aktivitet.

  Villkoren i tur och ordning: personen är inte värden själv, har inte stängt
  av, har ett intresse som matchar kategorin, bor inom sin egen valda radie,
  är inte blockerad åt något håll, får se aktiviteten alls (en aktivitet för
  kompisar aviseras bara till kompisar), är vaken enligt sitt eget fönster,
  har inte redan fått den här, och har kvar utrymme för dagen.

  Timmen jämförs mot Europe/Stockholm och inte mot serverns tid. En notis
  klockan fyra på natten är värre än ingen notis alls.
*/
create or replace function audience_for_spontaneous(p_activity_id uuid)
returns table (user_id uuid)
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  with activity as (
    select * from activities where id = p_activity_id and kind = 'now'
  ),
  local_hour as (
    select extract(hour from now() at time zone 'Europe/Stockholm')::int as h
  )
  select p.id
  from activity a
  join profiles p on p.id <> a.host_id
  left join notification_prefs np on np.user_id = p.id
  cross join local_hour lh
  where a.status = 'open'
    and a.starts_at > now()
    and not p.is_suspended
    and coalesce(np.spontaneous, true)
    and (a.category is null or p.interests @> array[a.category])
    and p.home_lat is not null
    and extensions.st_dwithin(
          p.home_geog, a.geog,
          coalesce(np.radius_km, 5) * 1000)
    and not is_blocked_between(p.id, a.host_id)
    and can_see_activity(a.id, p.id)
    -- Tyst fönster, skrivet så att det tål att gå över midnatt.
    and case
          when coalesce(np.quiet_from, 21) < coalesce(np.quiet_to, 8)
            then lh.h < coalesce(np.quiet_from, 21) or lh.h >= coalesce(np.quiet_to, 8)
          else lh.h >= coalesce(np.quiet_to, 8) and lh.h < coalesce(np.quiet_from, 21)
        end
    and not exists (
      select 1 from notifications_sent ns
      where ns.user_id = p.id and ns.activity_id = a.id
    )
    and (
      select count(*) from notifications_sent ns
      where ns.user_id = p.id and ns.sent_at > now() - interval '24 hours'
    ) < coalesce(np.max_per_day, 4);
$$;

-- ---------------------------------------------------------------------------
-- Åtkomst
--
-- En pushtoken pekar ut en telefon och ett notisval säger något om när någon
-- sover. Bägge är privata: bara du når dina egna rader. Loggen skrivs av
-- servern och läses av ingen, den finns bara för att kunna räkna.
-- ---------------------------------------------------------------------------

alter table push_tokens        enable row level security;
alter table notification_prefs enable row level security;
alter table notifications_sent enable row level security;

create policy push_tokens_own on push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_prefs_own on notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ingen select-policy: raderna är till för räkning, inte för läsning.
create policy notifications_sent_none on notifications_sent
  for select using (false);

/*
  Markerar att en avisering gått ut.

  Kallas av det som faktiskt skickar, efter att sändningen lyckats. Att skriva
  före sändning vore fel åt fel håll: då tystas en person av en notis som
  aldrig kom fram.
*/
create or replace function mark_notified(p_activity_id uuid, p_user_ids uuid[])
returns int
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  with inserted as (
    insert into notifications_sent (user_id, activity_id)
    select unnest(p_user_ids), p_activity_id
    on conflict do nothing
    returning 1
  )
  select count(*)::int from inserted;
$$;

revoke execute on function mark_notified(uuid, uuid[]) from public, authenticated;
revoke execute on function audience_for_spontaneous(uuid) from public, authenticated;
