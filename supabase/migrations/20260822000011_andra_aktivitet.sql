/*
  Ändra en aktivitet, och tala om det.

  Hittills fanns bara skapa och ställa in. Fel tid eller felstavad titel gick
  därför bara att lösa genom att ställa in och göra om, och då försvann både
  de sökande och chatten. En värd som behöver flytta fram en timme ska inte
  behöva sprida ut sitt sällskap för att göra det.

  Den andra halvan är viktigare än den första: en ändring som ingen får veta
  om är värre än ingen ändring alls. Någon dyker upp klockan ett när ni bytt
  till tre. Därför skriver funktionerna nedan i tråden när tid eller plats
  ändras, och när aktiviteten ställs in.
*/

-- ---------------------------------------------------------------------------
-- Hjälpare
-- ---------------------------------------------------------------------------

/*
  Systemhälsning i en aktivitets tråd, om den har någon.

  Har ingen accepterats än finns ingen tråd, och då finns inte heller någon
  som behöver veta.
*/
create or replace function post_activity_notice(p_activity_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_thread uuid;
begin
  select id into v_thread from threads where activity_id = p_activity_id;
  if v_thread is null then return; end if;

  insert into messages (thread_id, sender_id, kind, body)
  values (v_thread, null, 'system', p_body);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ändra
-- ---------------------------------------------------------------------------

/*
  null i ett argument betyder "rör inte", inte "sätt till null".

  Det gör att klienten kan skicka bara det som ändrats. Priset är att det
  inte går att nolla ett fält den här vägen, och det är ett medvetet byte:
  att av misstag radera någons beskrivning är värre än att inte kunna tömma
  den.

  kind går inte att ändra. En planerad aktivitet och en spontan är olika
  saker med olika regler, inte två lägen av samma.
*/
create or replace function update_activity(
  p_activity_id   uuid,
  p_title         text default null,
  p_description   text default null,
  p_category      text default null,
  p_cover_url     text default null,
  p_location_name text default null,
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_starts_at     timestamptz default null,
  p_ends_at       timestamptz default null,
  p_capacity      int default null,
  p_visibility    activity_visibility default null,
  p_price_sek     int default null
)
returns activities
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me       uuid := auth.uid();
  v_before   activities;
  v_after    activities;
  v_accepted int;
  v_notices  text[] := '{}';
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  select * into v_before from activities where id = p_activity_id;
  if not found then
    raise exception 'Aktiviteten finns inte' using errcode = 'P0002';
  end if;

  if v_before.host_id <> v_me then
    raise exception 'Bara värden kan ändra aktiviteten' using errcode = '42501';
  end if;

  if v_before.status not in ('open', 'full') then
    raise exception 'Aktiviteten går inte att ändra längre' using errcode = '22023';
  end if;

  if v_before.ends_at < now() then
    raise exception 'Aktiviteten har redan varit' using errcode = '22023';
  end if;

  -- Kapaciteten får inte sänkas under dem som redan tackat ja. Att kasta ut
  -- någon som fått ett ja är inte en ändring, det är ett löftesbrott.
  select count(*)::int into v_accepted
  from activity_participants
  where activity_id = p_activity_id and status = 'accepted';

  if p_capacity is not null and p_capacity < v_accepted then
    raise exception 'Redan % personer med, går inte att sänka till %',
      v_accepted, p_capacity using errcode = '22023';
  end if;

  update activities set
    title         = coalesce(p_title, title),
    description   = coalesce(p_description, description),
    category      = coalesce(p_category, category),
    cover_url     = coalesce(p_cover_url, cover_url),
    location_name = coalesce(p_location_name, location_name),
    lat           = coalesce(p_lat, lat),
    lng           = coalesce(p_lng, lng),
    starts_at     = coalesce(p_starts_at, starts_at),
    ends_at       = coalesce(p_ends_at, ends_at),
    capacity      = coalesce(p_capacity, capacity),
    visibility    = coalesce(p_visibility, visibility),
    price_sek     = coalesce(p_price_sek, price_sek),
    updated_at    = now()
  where id = p_activity_id
  returning * into v_after;

  -- Bara det som en deltagare behöver planera om för. En rättad stavning i
  -- beskrivningen ska inte pinga sex personer.
  if v_after.starts_at <> v_before.starts_at or v_after.ends_at <> v_before.ends_at then
    v_notices := v_notices || ('Ny tid: ' || to_char(
      v_after.starts_at at time zone 'Europe/Stockholm', 'FMDD FMMonth HH24:MI'));
  end if;

  if v_after.location_name <> v_before.location_name then
    v_notices := v_notices || ('Ny plats: ' || v_after.location_name);
  end if;

  if array_length(v_notices, 1) is not null then
    perform post_activity_notice(
      p_activity_id, array_to_string(v_notices, '. ') || '.');
  end if;

  return v_after;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ställ in
--
-- Fanns tidigare bara som en rå tabelluppdatering från klienten, vilket
-- betydde att ingen fick veta. Nu är det en funktion, och den skriver i
-- tråden.
-- ---------------------------------------------------------------------------

create or replace function cancel_activity(p_activity_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_host uuid;
begin
  select host_id into v_host from activities where id = p_activity_id;
  if v_host is null then
    raise exception 'Aktiviteten finns inte' using errcode = 'P0002';
  end if;
  if v_host <> v_me then
    raise exception 'Bara värden kan ställa in aktiviteten' using errcode = '42501';
  end if;

  update activities
     set status = 'cancelled',
         cancelled_reason = p_reason,
         updated_at = now()
   where id = p_activity_id;

  perform post_activity_notice(
    p_activity_id,
    case
      when p_reason is null or btrim(p_reason) = '' then 'Aktiviteten är inställd.'
      else 'Aktiviteten är inställd: ' || p_reason
    end);
end;
$$;

revoke execute on function post_activity_notice(uuid, text) from public, authenticated;
grant execute on function update_activity(
  uuid, text, text, text, text, text, double precision, double precision,
  timestamptz, timestamptz, int, activity_visibility, int) to authenticated;
grant execute on function cancel_activity(uuid, text) to authenticated;
