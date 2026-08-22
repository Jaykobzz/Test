-- FRIEND — radsäkerhet
--
-- Grundhållningen: allt är stängt tills en policy öppnar det, och skrivningar
-- som har regler (ansöka, acceptera, betygsätta) går ALDRIG direkt mot tabellen
-- utan via en RPC som validerar först. Därför saknas insert-policies på flera
-- tabeller — det är avsiktligt, inte förbisett.

set search_path = public, extensions;

alter table profiles              enable row level security;
alter table interests             enable row level security;
alter table activities            enable row level security;
alter table activity_participants enable row level security;
alter table threads               enable row level security;
alter table thread_members        enable row level security;
alter table messages              enable row level security;
alter table ratings               enable row level security;
alter table safety_flags          enable row level security;
alter table friendships           enable row level security;
alter table blocks                enable row level security;
alter table reports               enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — du ser bara din egen råa rad. Andras profiler läses via vyn
-- public_profiles, som utelämnar personnummerhash, juridiskt namn och koordinater.
-- ---------------------------------------------------------------------------

create policy "läs egen profil" on profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "uppdatera egen profil" on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiler skapas enbart av bankid-auth-funktionen (service_role).
-- Kolumngrant hindrar att en inloggad användare skriver om sin egen
-- BankID-verifiering även om raden är "hens".
revoke update on profiles from authenticated;
grant update (display_name, bio, avatar_url, interests,
              home_lat, home_lng, home_area_label) on profiles to authenticated;

revoke all on profiles from anon;

-- ---------------------------------------------------------------------------
-- interests — öppen katalog
-- ---------------------------------------------------------------------------

create policy "alla inloggade läser intressen" on interests
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------

create policy "se aktiviteter du har tillgång till" on activities
  for select to authenticated
  using (can_see_activity(id, (select auth.uid())));

create policy "skapa egen aktivitet" on activities
  for insert to authenticated
  with check (host_id = (select auth.uid()));

create policy "ändra egen aktivitet" on activities
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

-- Aktiviteter med accepterade deltagare avlyses, de raderas inte — annars
-- försvinner chatten och betygen under fötterna på folk.
create policy "radera egen tom aktivitet" on activities
  for delete to authenticated
  using (
    host_id = (select auth.uid())
    and not exists (
      select 1 from activity_participants ap
      where ap.activity_id = activities.id and ap.status = 'accepted'
    )
  );

-- ---------------------------------------------------------------------------
-- activity_participants — ansökningar
-- ---------------------------------------------------------------------------

create policy "se egna ansökningar och de till din aktivitet" on activity_participants
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_activity_host(activity_id, (select auth.uid()))
  );

-- Att ansöka går via apply_to_activity(); att besluta via decide_application().
-- Det enda man får göra direkt är att dra tillbaka sin egen ansökan.
create policy "dra tillbaka egen ansökan" on activity_participants
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('pending', 'accepted'))
  with check (user_id = (select auth.uid()) and status = 'withdrawn');

-- ---------------------------------------------------------------------------
-- Chatt
-- ---------------------------------------------------------------------------

create policy "se trådar du är med i" on threads
  for select to authenticated
  using (is_thread_member(id, (select auth.uid())));

create policy "se medlemmar i dina trådar" on thread_members
  for select to authenticated
  using (is_thread_member(thread_id, (select auth.uid())));

create policy "uppdatera din egen läsmarkering" on thread_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "lämna en tråd" on thread_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "läs meddelanden i dina trådar" on messages
  for select to authenticated
  using (is_thread_member(thread_id, (select auth.uid())));

create policy "skriv i dina trådar" on messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and kind <> 'system'
    and is_thread_member(thread_id, (select auth.uid()))
  );

create policy "ändra eget meddelande" on messages
  for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

-- Listor är gemensamma: vem som helst i tråden får bocka av en punkt.
create policy "bocka av i delade listor" on messages
  for update to authenticated
  using (kind = 'list' and is_thread_member(thread_id, (select auth.uid())))
  with check (kind = 'list' and is_thread_member(thread_id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- ratings — du ser vad DU har satt, aldrig vad andra satt på dig.
-- Den som betygsätts ser bara sitt snitt via public_profiles. Det är med flit:
-- ett synligt "vem gav mig tvåan" bjuder in till hämnd.
-- ---------------------------------------------------------------------------

create policy "se betyg du själv satt" on ratings
  for select to authenticated
  using (rater_id = (select auth.uid()));

-- safety_flags har medvetet noll policies: bara service_role kommer åt den.

-- ---------------------------------------------------------------------------
-- friendships — BFF
-- ---------------------------------------------------------------------------

create policy "se dina vänskapsrelationer" on friendships
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy "avsluta en vänskap" on friendships
  for delete to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- blocks och reports
-- ---------------------------------------------------------------------------

create policy "se egna blockeringar" on blocks
  for select to authenticated using (blocker_id = (select auth.uid()));

create policy "blockera någon" on blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));

create policy "avblockera" on blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "se egna anmälningar" on reports
  for select to authenticated using (reporter_id = (select auth.uid()));

create policy "anmäl" on reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on public_profiles from anon;
grant select on public_profiles to authenticated;

-- RPC:er är öppna för inloggade; var och en gör sin egen behörighetskontroll.
revoke execute on all functions in schema public from anon, authenticated;

grant execute on function discover_activities(double precision, double precision, int,
       text[], timestamptz, timestamptz, int, int)            to authenticated;
grant execute on function apply_to_activity(uuid, text)       to authenticated;
grant execute on function decide_application(uuid, boolean)   to authenticated;
grant execute on function ensure_direct_thread(uuid)          to authenticated;
grant execute on function submit_rating(uuid, uuid, smallint, smallint, boolean, text)
                                                              to authenticated;
grant execute on function pending_ratings(uuid)               to authenticated;
grant execute on function request_bff(uuid)                   to authenticated;
grant execute on function respond_bff(uuid, boolean)          to authenticated;
grant execute on function rating_summary(uuid)                to authenticated;
grant execute on function are_bffs(uuid, uuid)                to authenticated;
grant execute on function complete_due_activities()           to authenticated;

-- Predikaten anropas av RLS internt och behöver inga klientgrants.
