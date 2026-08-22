-- FRIEND — "skulle du göra om det?"
--
-- Ersätter det borttagna betygssystemet, men vänder på riktningen. Ett betyg
-- är en dom som lämnas över någon. Det här är en fråga om vad DU vill göra
-- härnäst, och den får konsekvenser bara om den andra vill samma sak.
--
-- Tre egenskaper som allt annat i filen tjänar:
--
--   1. Ett nej gör ingenting. Det räknas inte, syns inte, och påverkar
--      varken profil, flöde eller möjligheten att ansöka. Det finns bara
--      inte, sett utifrån.
--   2. Bara ömsesidiga ja blir synliga. Ingen får veta vad någon annan svarat.
--   3. Tystnad är tvetydig med flit. Eftersom ett svar kan dröja går det
--      aldrig att sluta sig till att någon sagt nej — bara att en matchning
--      ännu inte finns. Klienten får därför ALDRIG visa "ingen matchning"
--      eller "väntar på svar"; då läcker tvetydigheten bort.
--
-- Frågan är formulerad kring aktiviteten, inte kring personen: appens jobb är
-- att få folk att göra saker ihop. Kompisrelationen är vad som händer om det
-- upprepas.

set search_path = public, extensions;

create table rematch_signals (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities (id) on delete cascade,
  from_user     uuid not null references profiles (id) on delete cascade,
  to_user       uuid not null references profiles (id) on delete cascade,

  wants_again   boolean not null,

  -- Sätts när man sett och hanterat en matchning, så att den slutar visas.
  acknowledged_at timestamptz,
  created_at    timestamptz not null default now(),

  unique (activity_id, from_user, to_user),
  constraint no_self_signal check (from_user <> to_user)
);

-- Uppslaget som avgör om det finns en matchning går från den andra hållet.
create index rematch_signals_incoming_idx
  on rematch_signals (to_user, from_user) where wants_again;

create index rematch_signals_mine_idx on rematch_signals (from_user);

comment on table rematch_signals is
  'Privat svar på "skulle du göra om det med X?". Läses aldrig av den som '
  'svaret handlar om — bara ömsesidiga ja lämnar tabellen, via rematches().';

alter table rematch_signals enable row level security;

-- Du ser bara dina EGNA svar. Ingen policy släpper någon till raderna som
-- handlar om en själv; matchningar går uteslutande via rematches() nedan.
create policy "se egna svar" on rematch_signals
  for select to authenticated
  using (from_user = (select auth.uid()));

-- Att kvittera en matchning är det enda man får skriva direkt.
create policy "kvittera egen matchning" on rematch_signals
  for update to authenticated
  using (from_user = (select auth.uid()))
  with check (from_user = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Svara
-- ---------------------------------------------------------------------------

create or replace function submit_rematch(
  p_activity_id uuid,
  p_to_user     uuid,
  p_wants_again boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me       uuid := auth.uid();
  v_activity activities;
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  if v_me = p_to_user then
    raise exception 'Du kan inte svara om dig själv' using errcode = '22023';
  end if;

  select * into v_activity from activities where id = p_activity_id;
  if not found then
    raise exception 'Aktiviteten finns inte' using errcode = 'P0002';
  end if;

  if v_activity.ends_at > now() then
    raise exception 'Aktiviteten är inte slut än' using errcode = '22023';
  end if;

  -- Två veckor. Sen är minnet för blekt för att svaret ska betyda något.
  if now() > v_activity.ends_at + interval '14 days' then
    raise exception 'Det här går inte att svara på längre' using errcode = '22023';
  end if;

  -- Båda måste faktiskt ha varit där.
  if not (
    (v_activity.host_id = v_me or is_accepted_participant(p_activity_id, v_me))
    and
    (v_activity.host_id = p_to_user or is_accepted_participant(p_activity_id, p_to_user))
  ) then
    raise exception 'Ni var inte båda med på aktiviteten' using errcode = '42501';
  end if;

  insert into rematch_signals (activity_id, from_user, to_user, wants_again)
  values (p_activity_id, v_me, p_to_user, p_wants_again)
  on conflict (activity_id, from_user, to_user) do update
    set wants_again     = excluded.wants_again,
        acknowledged_at = null,
        created_at      = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Vem är kvar att svara om?
-- ---------------------------------------------------------------------------

create or replace function rematch_prompts()
returns table (
  activity_id    uuid,
  activity_title text,
  ends_at        timestamptz,
  user_id        uuid,
  display_name   text,
  avatar_url     text
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with me as (select auth.uid() as uid),
  -- Aktiviteter jag var med på som är slut men fortfarande inom fönstret.
  mine as (
    select a.*
    from activities a, me
    where a.status = 'completed'
      and a.ends_at < now()
      and a.ends_at > now() - interval '14 days'
      and (a.host_id = me.uid or is_accepted_participant(a.id, me.uid))
  ),
  -- Alla som var där, utom jag själv.
  others as (
    select mine.id as activity_id, mine.title, mine.ends_at, mine.host_id as uid
    from mine
    union
    select mine.id, mine.title, mine.ends_at, ap.user_id
    from mine
    join activity_participants ap
      on ap.activity_id = mine.id and ap.status = 'accepted'
  )
  select o.activity_id, o.title, o.ends_at, p.id, p.display_name, p.avatar_url
  from others o
  join profiles p on p.id = o.uid
  cross join me
  where o.uid <> me.uid
    and not p.is_suspended
    and not is_blocked_between(o.uid, me.uid)
    and not exists (
      select 1 from rematch_signals r
      where r.activity_id = o.activity_id
        and r.from_user = me.uid
        and r.to_user = o.uid
    )
  order by o.ends_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Matchningar — bara dubbla ja
--
-- Den här funktionen är den enda vägen ut ur rematch_signals för uppgifter om
-- någon annan, och den släpper igenom en rad först när BÅDA sagt ja. Ett
-- ensidigt ja lämnar aldrig tabellen.
-- ---------------------------------------------------------------------------

create or replace function rematches()
returns table (
  user_id        uuid,
  display_name   text,
  avatar_url     text,
  home_area_label text,
  activity_id    uuid,
  activity_title text,
  matched_at     timestamptz
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.home_area_label,
    a.id,
    a.title,
    greatest(mine.created_at, theirs.created_at)
  from rematch_signals mine
  join rematch_signals theirs
    on  theirs.activity_id = mine.activity_id
    and theirs.from_user   = mine.to_user
    and theirs.to_user     = mine.from_user
    and theirs.wants_again
  join profiles p   on p.id = mine.to_user
  join activities a on a.id = mine.activity_id
  where mine.from_user = auth.uid()
    and mine.wants_again
    and mine.acknowledged_at is null
    and not p.is_suspended
    and not is_blocked_between(p.id, auth.uid())
  order by greatest(mine.created_at, theirs.created_at) desc;
$$;

/**
 * Kvittera en matchning så att den slutar visas.
 *
 * Skriver bara på den egna raden — den andra personens matchning ligger kvar
 * tills hen kvitterar sin.
 */
create or replace function acknowledge_rematch(p_activity_id uuid, p_other uuid)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  update rematch_signals
     set acknowledged_at = now()
   where from_user = auth.uid()
     and to_user = p_other
     and activity_id = p_activity_id;
$$;

revoke execute on function submit_rematch(uuid, uuid, boolean) from anon, authenticated;
revoke execute on function rematch_prompts()                    from anon, authenticated;
revoke execute on function rematches()                          from anon, authenticated;
revoke execute on function acknowledge_rematch(uuid, uuid)      from anon, authenticated;

grant execute on function submit_rematch(uuid, uuid, boolean) to authenticated;
grant execute on function rematch_prompts()                   to authenticated;
grant execute on function rematches()                         to authenticated;
grant execute on function acknowledge_rematch(uuid, uuid)     to authenticated;
