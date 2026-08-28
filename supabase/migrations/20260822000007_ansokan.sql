/*
  Ansökan får innehåll.

  Problemet: en värd med tjugo sökande såg tjugo namn och tjugo bilder och
  hade ingenting att välja på. Intresse hjälper inte där, för alla som sökt
  till en fisketur gillar redan att fiska. Att söka är en starkare signal än
  en ikryssad ruta, så vid urvalet är hela högen redan sållad.

  Det som skiljer sökande åt är vad de själva skriver. Därför blir meningen
  obligatorisk. Ansträngningen är dessutom i sig en signal: den som skriver
  något dyker upp oftare än den som tryckte en gång.

  Nivån beskriver personens förhållande till just den här aktiviteten, inte
  till personen. "Första gången" är ingen brist, det är en upplysning som
  låter en värd blanda eller matcha. Det är avsiktligt inte ett omdöme, och
  det finns fortfarande ingen tabell någonstans som bär ett omdöme om någon.
*/

create type experience_level as enum ('first_time', 'some', 'often');

alter table activity_participants
  add column experience experience_level;

/*
  Kravet på en mening gäller framåt. Befintliga rader har ingen och ska inte
  få en påhittad, därför är villkoret skrivet så att det bara biter på det
  som faktiskt fyllts i, medan funktionen nedan kräver den vid nya ansökningar.
*/
alter table activity_participants
  add constraint intro_message_meaningful
  check (intro_message is null or length(btrim(intro_message)) >= 5);

comment on column activity_participants.experience is
  'Sökandens vana vid just den här sortens aktivitet. Aldrig ett omdöme om personen.';

-- ---------------------------------------------------------------------------
-- apply_to_activity, nu med mening och nivå
--
-- Samma kontroller som förut. Skillnaden är att meningen krävs, och att
-- nivån följer med. Signaturen byter form, så den gamla versionen tas bort
-- först; annars skulle två överlagringar leva sida vid sida och anropet
-- bli tvetydigt.
-- ---------------------------------------------------------------------------

drop function if exists apply_to_activity(uuid, text);

create or replace function apply_to_activity(
  p_activity_id uuid,
  p_message     text,
  p_experience  experience_level default null
)
returns activity_participants
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me       uuid := auth.uid();
  v_activity activities;
  v_age      int;
  v_accepted int;
  v_row      activity_participants;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  if p_message is null or length(btrim(p_message)) < 5 then
    raise exception 'Skriv en rad om varför du vill haka på' using errcode = '22023';
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

  insert into activity_participants (activity_id, user_id, status, intro_message, experience)
  values (p_activity_id, v_me, 'pending', btrim(p_message), p_experience)
  on conflict (activity_id, user_id) do update
    set status        = case
                          when activity_participants.status in ('withdrawn', 'declined')
                            then 'pending'::join_status
                          else activity_participants.status
                        end,
        intro_message = excluded.intro_message,
        experience    = excluded.experience,
        created_at    = now()
  returning * into v_row;

  return v_row;
end;
$$;
