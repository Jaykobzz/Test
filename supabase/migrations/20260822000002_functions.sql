-- FRIEND — funktioner, vyer och RPC:er
--
-- Alla hjälpfunktioner nedan är SECURITY DEFINER av ett specifikt skäl: de anropas
-- inifrån RLS-policies. Om de vore SECURITY INVOKER skulle en policy på t.ex.
-- thread_members behöva läsa thread_members, vilket ger oändlig rekursion.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Små predikat som RLS-policies bygger på
-- ---------------------------------------------------------------------------

create or replace function are_bffs(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id)    = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

create or replace function is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function is_thread_member(p_thread uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from thread_members
    where thread_id = p_thread and user_id = p_user
  );
$$;

create or replace function is_activity_host(p_activity uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from activities where id = p_activity and host_id = p_user
  );
$$;

create or replace function is_accepted_participant(p_activity uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from activity_participants
    where activity_id = p_activity and user_id = p_user and status = 'accepted'
  );
$$;

-- Kan den här personen alls se aktiviteten? Samlar hela synlighetsregeln på ett ställe.
create or replace function can_see_activity(p_activity uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from activities a
    where a.id = p_activity
      and not is_blocked_between(a.host_id, p_user)
      and (
           a.host_id = p_user
        or is_accepted_participant(a.id, p_user)
        or (a.visibility = 'public')
        or (a.visibility = 'bff' and are_bffs(a.host_id, p_user))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Betyg: aggregat
-- ---------------------------------------------------------------------------

-- Snittstjärnor = medelvärdet av "kul" och "trevlig". Trygghet räknas inte in
-- i den publika siffran; den hanteras separat i safety_flags.
create or replace function rating_summary(p_user uuid)
returns table (avg_stars numeric, rating_count int)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    round(avg((fun + friendliness) / 2.0)::numeric, 2) as avg_stars,
    count(*)::int                                      as rating_count
  from ratings
  where ratee_id = p_user;
$$;

-- ---------------------------------------------------------------------------
-- public_profiles — det ENDA sättet en användare ser någon annans profil
--
-- Utelämnar personnummerhash, juridiskt namn och exakta koordinater.
-- ---------------------------------------------------------------------------

-- security_invoker = false är medvetet. Vyn körs som ägare och kringgår därmed
-- RLS på profiles — det är själva poängen: RLS på profiles släpper bara igenom
-- din EGEN rad, och den här vyn är den kontrollerade kanalen som visar ett
-- beskuret urval av andras. Radfiltret nedan gör jobbet som RLS annars gjort.
create or replace view public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.interests,
  p.home_area_label,
  p.birth_year,
  (extract(year from now())::int - p.birth_year) as approx_age,
  p.verified_at is not null                      as bankid_verified,
  p.created_at,
  r.avg_stars,
  coalesce(r.rating_count, 0)                    as rating_count,
  (select count(*)::int from activities a
     where a.host_id = p.id and a.status = 'completed')      as activities_hosted,
  (select count(*)::int from activity_participants ap
     where ap.user_id = p.id and ap.status = 'accepted')     as activities_joined,
  (select count(*)::int from friendships f
     where f.status = 'accepted'
       and (f.requester_id = p.id or f.addressee_id = p.id)) as bff_count
from profiles p
cross join lateral rating_summary(p.id) r
where p.is_suspended = false
  and auth.uid() is not null
  and not is_blocked_between(p.id, auth.uid());

comment on view public_profiles is
  'Säker projektion av profiles. Innehåller varken personnummerhash, juridiskt '
  'namn eller exakta hemkoordinater.';

-- ---------------------------------------------------------------------------
-- Upptäck aktiviteter i närheten
-- ---------------------------------------------------------------------------

create or replace function discover_activities(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   int     default 15000,
  p_interests  text[]  default null,
  p_from       timestamptz default now(),
  p_to         timestamptz default null,
  p_limit      int     default 50,
  p_offset     int     default 0
)
returns table (
  id             uuid,
  host_id        uuid,
  host_name      text,
  host_avatar    text,
  host_stars     numeric,
  title          text,
  description    text,
  category       text,
  cover_url      text,
  location_name  text,
  lat            double precision,
  lng            double precision,
  distance_m     int,
  starts_at      timestamptz,
  ends_at        timestamptz,
  visibility     activity_visibility,
  capacity       int,
  accepted_count int,
  spots_left     int,
  my_status      join_status
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with me as (select auth.uid() as uid)
  select
    a.id,
    a.host_id,
    hp.display_name,
    hp.avatar_url,
    hr.avg_stars,
    a.title,
    a.description,
    a.category,
    a.cover_url,
    a.location_name,
    a.lat,
    a.lng,
    st_distance(
      a.geog,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    )::int as distance_m,
    a.starts_at,
    a.ends_at,
    a.visibility,
    a.capacity,
    acc.n as accepted_count,
    case when a.capacity is null then null else greatest(a.capacity - acc.n, 0) end as spots_left,
    mine.status
  from activities a
  cross join me
  join profiles hp on hp.id = a.host_id
  cross join lateral rating_summary(a.host_id) hr
  cross join lateral (
    select count(*)::int as n
    from activity_participants ap
    where ap.activity_id = a.id and ap.status = 'accepted'
  ) acc
  left join lateral (
    select ap.status
    from activity_participants ap
    where ap.activity_id = a.id and ap.user_id = me.uid
  ) mine on true
  where a.status = 'open'
    and a.starts_at >= p_from
    and (p_to is null or a.starts_at <= p_to)
    and st_dwithin(
          a.geog,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
    and (p_interests is null or a.category = any (p_interests))
    and not is_blocked_between(a.host_id, me.uid)
    and (
         a.visibility = 'public'
      or (a.visibility = 'bff' and are_bffs(a.host_id, me.uid))
      or a.host_id = me.uid
    )
    and not hp.is_suspended
  order by a.starts_at asc, distance_m asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

comment on function discover_activities is
  'Flödet i Upptäck. Filtrerar på radie, tid och intresse, och respekterar '
  'både blockeringar och BFF-synlighet.';

-- ---------------------------------------------------------------------------
-- Ansök om att haka på
-- ---------------------------------------------------------------------------

create or replace function apply_to_activity(
  p_activity_id uuid,
  p_message     text default null
)
returns activity_participants
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me       uuid := auth.uid();
  v_activity activities;
  v_stars    numeric;
  v_age      int;
  v_accepted int;
  v_row      activity_participants;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  select * into v_activity from activities where id = p_activity_id;
  if not found then
    raise exception 'Aktiviteten finns inte' using errcode = 'P0002';
  end if;

  if not can_see_activity(p_activity_id, v_me) then
    raise exception 'Du har inte tillgång till den här aktiviteten' using errcode = '42501';
  end if;

  if v_activity.host_id = v_me then
    raise exception 'Du är värd för aktiviteten' using errcode = '22023';
  end if;

  if v_activity.status <> 'open' then
    raise exception 'Aktiviteten tar inte emot fler ansökningar' using errcode = '22023';
  end if;

  if v_activity.starts_at <= now() then
    raise exception 'Aktiviteten har redan börjat' using errcode = '22023';
  end if;

  -- Värdens frivilliga trösklar
  if v_activity.min_rating is not null then
    select avg_stars into v_stars from rating_summary(v_me);
    -- Den som ännu inte har något betyg släpps igenom; annars kan man aldrig börja.
    if v_stars is not null and v_stars < v_activity.min_rating then
      raise exception 'Ditt betyg är lägre än vad värden har satt som krav'
        using errcode = '42501';
    end if;
  end if;

  if v_activity.min_age is not null then
    select extract(year from now())::int - birth_year into v_age
    from profiles where id = v_me;
    if v_age < v_activity.min_age then
      raise exception 'Aktiviteten har en åldersgräns' using errcode = '42501';
    end if;
  end if;

  select count(*)::int into v_accepted
  from activity_participants
  where activity_id = p_activity_id and status = 'accepted';

  if v_activity.capacity is not null and v_accepted >= v_activity.capacity then
    raise exception 'Aktiviteten är full' using errcode = '22023';
  end if;

  insert into activity_participants (activity_id, user_id, status, intro_message)
  values (p_activity_id, v_me, 'pending', p_message)
  on conflict (activity_id, user_id) do update
    set status        = case
                          when activity_participants.status in ('withdrawn', 'declined')
                            then 'pending'::join_status
                          else activity_participants.status
                        end,
        intro_message = coalesce(excluded.intro_message, activity_participants.intro_message),
        created_at    = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Värden accepterar eller tackar nej
--
-- Att acceptera gör två saker: sätter status, och lägger in personen i
-- aktivitetens chattgrupp. Det är den kopplingen hela appen vilar på.
-- ---------------------------------------------------------------------------

create or replace function decide_application(
  p_participant_id uuid,
  p_accept         boolean
)
returns activity_participants
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me        uuid := auth.uid();
  v_row       activity_participants;
  v_activity  activities;
  v_thread_id uuid;
  v_accepted  int;
  v_name      text;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  select * into v_row from activity_participants where id = p_participant_id;
  if not found then
    raise exception 'Ansökan finns inte' using errcode = 'P0002';
  end if;

  select * into v_activity from activities where id = v_row.activity_id;

  if v_activity.host_id <> v_me then
    raise exception 'Bara värden kan besluta om ansökningar' using errcode = '42501';
  end if;

  if not p_accept then
    update activity_participants
       set status = 'declined', decided_at = now(), decided_by = v_me
     where id = p_participant_id
     returning * into v_row;
    return v_row;
  end if;

  select count(*)::int into v_accepted
  from activity_participants
  where activity_id = v_row.activity_id and status = 'accepted';

  if v_activity.capacity is not null and v_accepted >= v_activity.capacity then
    raise exception 'Aktiviteten är redan full' using errcode = '22023';
  end if;

  update activity_participants
     set status = 'accepted', decided_at = now(), decided_by = v_me
   where id = p_participant_id
   returning * into v_row;

  -- Chattgruppen skapas lat: först när någon faktiskt accepterats.
  v_thread_id := ensure_activity_thread(v_row.activity_id);

  insert into thread_members (thread_id, user_id)
  values (v_thread_id, v_row.user_id)
  on conflict do nothing;

  select display_name into v_name from profiles where id = v_row.user_id;
  insert into messages (thread_id, sender_id, kind, body)
  values (v_thread_id, null, 'system', v_name || ' är med!');

  -- Full? Stäng för fler ansökningar.
  if v_activity.capacity is not null and v_accepted + 1 >= v_activity.capacity then
    update activities set status = 'full', updated_at = now() where id = v_activity.id;
  end if;

  return v_row;
end;
$$;

create or replace function ensure_activity_thread(p_activity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_thread_id uuid;
  v_activity  activities;
begin
  select id into v_thread_id from threads where activity_id = p_activity_id;
  if v_thread_id is not null then
    return v_thread_id;
  end if;

  select * into v_activity from activities where id = p_activity_id;

  insert into threads (kind, activity_id, title)
  values ('activity', p_activity_id, v_activity.title)
  returning id into v_thread_id;

  -- Värden är alltid med i sin egen aktivitets chatt.
  insert into thread_members (thread_id, user_id)
  values (v_thread_id, v_activity.host_id)
  on conflict do nothing;

  return v_thread_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Direktchatt mellan två personer (BFF eller tidigare aktivitetskompisar)
-- ---------------------------------------------------------------------------

create or replace function ensure_direct_thread(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me        uuid := auth.uid();
  v_thread_id uuid;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  if v_me = p_other then
    raise exception 'Kan inte chatta med dig själv' using errcode = '22023';
  end if;

  if is_blocked_between(v_me, p_other) then
    raise exception 'Chatten är inte tillgänglig' using errcode = '42501';
  end if;

  -- Man får bara öppna en direktchatt med någon man faktiskt delat något med.
  if not (
    are_bffs(v_me, p_other)
    or exists (
      select 1
      from activity_participants a
      join activity_participants b on a.activity_id = b.activity_id
      where a.user_id = v_me and b.user_id = p_other
        and a.status = 'accepted' and b.status = 'accepted'
    )
    or exists (
      select 1 from activities act
      join activity_participants ap on ap.activity_id = act.id and ap.status = 'accepted'
      where (act.host_id = v_me and ap.user_id = p_other)
         or (act.host_id = p_other and ap.user_id = v_me)
    )
  ) then
    raise exception 'Ni har inte gjort något ihop än' using errcode = '42501';
  end if;

  select t.id into v_thread_id
  from threads t
  where t.kind = 'direct'
    and (select count(*) from thread_members tm where tm.thread_id = t.id) = 2
    and exists (select 1 from thread_members tm where tm.thread_id = t.id and tm.user_id = v_me)
    and exists (select 1 from thread_members tm where tm.thread_id = t.id and tm.user_id = p_other)
  limit 1;

  if v_thread_id is not null then
    return v_thread_id;
  end if;

  insert into threads (kind) values ('direct') returning id into v_thread_id;
  insert into thread_members (thread_id, user_id)
  values (v_thread_id, v_me), (v_thread_id, p_other);

  return v_thread_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Efter aktiviteten: betygsätt
-- ---------------------------------------------------------------------------

create or replace function submit_rating(
  p_activity_id  uuid,
  p_ratee_id     uuid,
  p_fun          smallint,
  p_friendliness smallint,
  p_felt_safe    boolean,
  p_comment      text default null
)
returns ratings
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me       uuid := auth.uid();
  v_activity activities;
  v_row      ratings;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  if v_me = p_ratee_id then
    raise exception 'Du kan inte betygsätta dig själv' using errcode = '22023';
  end if;

  select * into v_activity from activities where id = p_activity_id;
  if not found then
    raise exception 'Aktiviteten finns inte' using errcode = 'P0002';
  end if;

  if v_activity.ends_at > now() then
    raise exception 'Aktiviteten är inte slut än' using errcode = '22023';
  end if;

  -- Betygsfönster: två veckor efteråt. Sen är minnet för blekt för att vara rättvist.
  if now() > v_activity.ends_at + interval '14 days' then
    raise exception 'Betygsfönstret har stängt' using errcode = '22023';
  end if;

  -- Båda måste ha varit där på riktigt (värd eller accepterad deltagare).
  if not (
    (v_activity.host_id = v_me or is_accepted_participant(p_activity_id, v_me))
    and
    (v_activity.host_id = p_ratee_id or is_accepted_participant(p_activity_id, p_ratee_id))
  ) then
    raise exception 'Ni var inte båda med på aktiviteten' using errcode = '42501';
  end if;

  insert into ratings (activity_id, rater_id, ratee_id, fun, friendliness, felt_safe, comment)
  values (p_activity_id, v_me, p_ratee_id, p_fun, p_friendliness, p_felt_safe, p_comment)
  on conflict (activity_id, rater_id, ratee_id) do update
    set fun          = excluded.fun,
        friendliness = excluded.friendliness,
        felt_safe    = excluded.felt_safe,
        comment      = excluded.comment,
        created_at   = now()
  returning * into v_row;

  -- "Kändes inte tryggt" går till moderation, inte till en publik siffra.
  if not p_felt_safe then
    insert into safety_flags (rating_id, flagged_user, raised_by, activity_id, note)
    values (v_row.id, p_ratee_id, v_me, p_activity_id, p_comment)
    on conflict (rating_id) do update
      set note = excluded.note, status = 'open', created_at = now();
  else
    delete from safety_flags where rating_id = v_row.id;
  end if;

  return v_row;
end;
$$;

-- Vem är kvar att betygsätta efter en aktivitet?
create or replace function pending_ratings(p_activity_id uuid)
returns table (user_id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with me as (select auth.uid() as uid),
  attendees as (
    select a.host_id as uid from activities a where a.id = p_activity_id
    union
    select ap.user_id from activity_participants ap
    where ap.activity_id = p_activity_id and ap.status = 'accepted'
  )
  select p.id, p.display_name, p.avatar_url
  from attendees at
  join profiles p on p.id = at.uid
  cross join me
  where at.uid <> me.uid
    and not exists (
      select 1 from ratings r
      where r.activity_id = p_activity_id
        and r.rater_id = me.uid
        and r.ratee_id = at.uid
    );
$$;

-- ---------------------------------------------------------------------------
-- BFF
-- ---------------------------------------------------------------------------

create or replace function request_bff(p_other uuid)
returns friendships
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me  uuid := auth.uid();
  v_row friendships;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;
  if v_me = p_other then
    raise exception 'Du är redan din egen bästa vän' using errcode = '22023';
  end if;
  if is_blocked_between(v_me, p_other) then
    raise exception 'Går inte' using errcode = '42501';
  end if;

  -- Finns redan en förfrågan åt andra hållet? Då är detta ett ja.
  select * into v_row from friendships
  where requester_id = p_other and addressee_id = v_me;

  if found then
    if v_row.status = 'accepted' then
      return v_row;
    end if;
    update friendships
       set status = 'accepted', responded_at = now()
     where id = v_row.id
     returning * into v_row;
    return v_row;
  end if;

  insert into friendships (requester_id, addressee_id, status)
  values (v_me, p_other, 'pending')
  on conflict (requester_id, addressee_id) do update
    set status = case
                   when friendships.status = 'declined' then 'pending'::friendship_status
                   else friendships.status
                 end,
        created_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function respond_bff(p_friendship_id uuid, p_accept boolean)
returns friendships
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me  uuid := auth.uid();
  v_row friendships;
begin
  select * into v_row from friendships where id = p_friendship_id;
  if not found then
    raise exception 'Förfrågan finns inte' using errcode = 'P0002';
  end if;
  if v_row.addressee_id <> v_me then
    raise exception 'Förfrågan är inte till dig' using errcode = '42501';
  end if;

  update friendships
     set status = case when p_accept then 'accepted' else 'declined' end::friendship_status,
         responded_at = now()
   where id = p_friendship_id
   returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch   before update on profiles
  for each row execute function touch_updated_at();
create trigger activities_touch before update on activities
  for each row execute function touch_updated_at();

-- Håll trådlistan sorterad utan att klienten behöver räkna.
create or replace function bump_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  update threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger messages_bump_thread after insert on messages
  for each row execute function bump_thread_activity();

-- Markera passerade aktiviteter som genomförda. Anropas av en schemalagd jobb
-- (pg_cron) eller vid behov från klienten när man öppnar en aktivitet.
create or replace function complete_due_activities()
returns int
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  with done as (
    update activities
       set status = 'completed', updated_at = now()
     where status in ('open', 'full')
       and ends_at < now()
    returning 1
  )
  select count(*)::int from done;
$$;
