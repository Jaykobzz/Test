-- Haka på — beteendetester
--
-- Kör hela vägen genom appens flöde som riktiga användare, med RLS påslagen.
-- Varje test byter till rollen `authenticated` och sätter auth.uid(), precis
-- som PostgREST gör per anrop. Superanvändaren kringgår RLS, så testerna vore
-- meningslösa utan rollbytet.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'MISSLYCKADES: %', message;
  end if;
  raise notice 'ok: %', message;
end $$;

-- Kör ett uttryck och kontrollera att det FAKTISKT vägras.
create or replace function assert_denied(sql text, message text)
returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok: % (%)', message, sqlerrm;
    return;
  end;
  raise exception 'MISSLYCKADES: % — anropet gick igenom fast det skulle vägras', message;
end $$;

/* Tre personer: Micke (värd), Sara och Johan. --------------------------- */

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'micke@test'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'sara@test'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'johan@test');

insert into profiles (id, personal_number_hash, legal_given_name, legal_family_name,
                      birth_year, display_name, avatar_url, interests,
                      home_lat, home_lng, home_area_label)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-micke', 'Mikael', 'Ek', 1984,
   'Micke', 'https://x/1.jpg', '{fiske,svamp}', 59.2617, 18.1204, 'Skarpnäck'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'hash-sara',  'Sara', 'Berg', 1991,
   'Sara',  'https://x/2.jpg', '{lopning,fiske}', 59.2735, 18.1305, 'Bagarmossen'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'hash-johan', 'Johan', 'Ås', 1988,
   'Johan', 'https://x/3.jpg', '{padel}', 59.2427, 18.0906, 'Farsta');

/* ---------------------------------------------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

insert into activities (id, host_id, title, description, category, cover_url,
                        location_name, lat, lng, starts_at, ends_at,
                        visibility, capacity)
values ('bbbbbbbb-0000-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'Fiska i Drevviken', 'Tar med extra spö.', 'fiske', 'https://x/c1.jpg',
        'Drevviken, Skarpnäck', 59.2617, 18.1204,
        now() + interval '20 hours', now() + interval '22 hours',
        'public', 2);

-- Samma värd, men bara för kompisar.
insert into activities (id, host_id, title, cover_url, location_name, lat, lng,
                        starts_at, ends_at, visibility)
values ('bbbbbbbb-0000-4000-8000-000000000002',
        'aaaaaaaa-0000-4000-8000-000000000001',
        'Svampstället', 'https://x/c2.jpg', 'Nackareservatet', 59.2903, 18.1571,
        now() + interval '4 days', now() + interval '4 days 3 hours', 'friends');

select assert_true(
  (select count(*) from activities where host_id = auth.uid()) = 2,
  'värden ser sina egna aktiviteter');
commit;

/* Synlighet: Sara ser den publika men inte kompis-aktiviteten -------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  (select count(*) from activities) = 1,
  'utan kompis syns bara den publika aktiviteten');

select assert_true(
  (select count(*) from discover_activities(59.2700, 18.1300, 15000)) = 1,
  'discover_activities döljer kompis-aktiviteten för utomstående');

select assert_true(
  (select count(*) from discover_activities(59.2700, 18.1300, 200)) = 0,
  'radien filtrerar bort det som ligger för långt bort');

-- Ansök
select assert_true(
  (apply_to_activity('bbbbbbbb-0000-4000-8000-000000000001',
                     'Har aldrig fiskat men vill lära mig!')).status = 'pending',
  'Sara kan ansöka och hamnar i pending');

select assert_true(
  (select my_status from discover_activities(59.2700, 18.1300, 15000)
    where id = 'bbbbbbbb-0000-4000-8000-000000000001') = 'pending',
  'flödet visar att man redan ansökt');
commit;

/* Johan får inte se Saras ansökan -------------------------------------- */

-- Ansökans id plockas ut som superanvändare och stoppas undan, så att nästa
-- test kan skicka in ett RIKTIGT id. Slog man upp det inifrån Johans session
-- skulle RLS ge null, och testet hade bevisat att null inte finns i stället
-- för att värdkontrollen håller.
select set_config('test.participant_id',
  (select id::text from activity_participants
    where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001'), false);

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select assert_true(
  (select count(*) from activity_participants) = 0,
  'utomstående ser inga ansökningar');

select assert_denied(
  $$ select decide_application(
       current_setting('test.participant_id')::uuid, true) $$,
  'bara värden får besluta om ansökningar');

-- En direkt UPDATE ger inget FEL — RLS filtrerar bort raden så att satsen
-- träffar noll rader. Det är rätt beteende; det som ska bevisas är att
-- statusen faktiskt står kvar oförändrad efteråt.
update activity_participants set status = 'accepted'
 where id = current_setting('test.participant_id')::uuid;
commit;

select assert_true(
  (select status from activity_participants
    where id = current_setting('test.participant_id')::uuid) = 'pending',
  'en utomståendes UPDATE lämnar ansökan orörd');

/* Värden accepterar — chatten ska öppnas ------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

select assert_true(
  (select count(*) from activity_participants where status = 'pending') = 1,
  'värden ser inkomna ansökningar');

select assert_true(
  (decide_application(
     (select id from activity_participants
       where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001'), true)).status = 'accepted',
  'värden kan acceptera');

select assert_true(
  (select count(*) from threads
    where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001') = 1,
  'ett accepterande skapar aktivitetens chattgrupp');

select assert_true(
  (select count(*) from thread_members tm
     join threads t on t.id = tm.thread_id
    where t.activity_id = 'bbbbbbbb-0000-4000-8000-000000000001') = 2,
  'både värd och deltagare är med i chatten');

select assert_true(
  (select count(*) from messages where kind = 'system') = 1,
  'ett systemmeddelande berättar att någon hakat på');

insert into messages (thread_id, sender_id, kind, body)
values ((select id from threads where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
        auth.uid(), 'text', 'Vi ses vid bryggan!');
commit;

/* Chatt: deltagaren kommer in, utomstående inte ------------------------ */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  (select count(*) from messages) = 2,
  'accepterad deltagare läser trådens meddelanden');

-- Dela en lista
insert into messages (thread_id, sender_id, kind, body, payload)
values ((select id from threads limit 1), auth.uid(), 'list', 'Att ta med',
        '{"items":[{"id":"1","text":"Termos","checkedBy":null}]}');

-- Dela en kartnål
insert into messages (thread_id, sender_id, kind, body, lat, lng)
values ((select id from threads limit 1), auth.uid(), 'place', 'Bryggan',
        59.2610, 18.1210);

select assert_denied(
  $$ insert into messages (thread_id, sender_id, kind, body)
     values ((select id from threads limit 1),
             'aaaaaaaa-0000-4000-8000-000000000001', 'text', 'Låtsas vara Micke') $$,
  'man kan inte skriva i någon annans namn');

select assert_denied(
  $$ insert into messages (thread_id, sender_id, kind, body)
     values ((select id from threads limit 1), auth.uid(), 'system', 'Falskt systemmeddelande') $$,
  'klienter kan inte förfalska systemmeddelanden');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select assert_true(
  (select count(*) from messages) = 0,
  'utomstående ser inga meddelanden alls');

select assert_true(
  (select count(*) from threads) = 0,
  'utomstående ser inte ens att tråden finns');
commit;

/* Kapacitet: aktiviteten tar två, en är tagen -------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';
select apply_to_activity('bbbbbbbb-0000-4000-8000-000000000001');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select decide_application(
  (select id from activity_participants
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000003'), true);

select assert_true(
  (select status from activities where id = 'bbbbbbbb-0000-4000-8000-000000000001') = 'full',
  'aktiviteten stängs när sista platsen tas');
commit;

/* kompis: efter accepterad kompisförfrågan syns kompis-aktiviteten ------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';
select request_friend('aaaaaaaa-0000-4000-8000-000000000001');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select respond_friend((select id from friendships), true);
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  are_friends(auth.uid(), 'aaaaaaaa-0000-4000-8000-000000000001'),
  'kompisrelationen är ömsesidig');

select assert_true(
  (select count(*) from activities where visibility = 'friends') = 1,
  'kompis ser nu den privata aktiviteten');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';
select assert_true(
  (select count(*) from activities where visibility = 'friends') = 0,
  'den som inte är kompis ser den fortfarande inte');
commit;

/* Profilsekretess ------------------------------------------------------ */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  (select count(*) from profiles) = 1,
  'man ser bara sin egen rad i profiles');

select assert_true(
  (select count(*) from public_profiles) = 3,
  'andras profiler läses via public_profiles');

select assert_true(
  not exists (
    select 1 from information_schema.columns
    where table_name = 'public_profiles'
      and column_name in ('personal_number_hash', 'legal_given_name',
                          'home_lat', 'home_lng')),
  'public_profiles läcker varken personnummerhash eller koordinater');

select assert_denied(
  $$ update profiles set personal_number_hash = 'kapad' where id = auth.uid() $$,
  'man kan inte skriva om sin egen BankID-verifiering');

update profiles set display_name = 'Sara B.' where id = auth.uid();
select assert_true(
  (select display_name from profiles where id = auth.uid()) = 'Sara B.',
  'men vanliga profilfält går att ändra');
commit;

/* Inga betyg — regressionsvakt ------------------------------------------
   Betygsättning togs bort medvetet. Testerna nedan finns för att fånga om
   den smyger tillbaka: en profil får bära fakta om vad någon gjort, aldrig
   någon annans omdöme om hen.                                              */

select assert_true(
  not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name in ('ratings', 'safety_flags')),
  'det finns ingen betygstabell i schemat');

select assert_true(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and column_name ilike any (array['%rating%', '%stars%', '%score%', '%felt_safe%'])),
  'ingen kolumn någonstans bär ett omdöme om en person');

-- Flytta aktiviteten bakåt i tiden så att den räknas som genomförd.
update activities
   set starts_at = now() - interval '3 hours',
       ends_at   = now() - interval '1 hour',
       status    = 'completed'
 where id = 'bbbbbbbb-0000-4000-8000-000000000001';

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

-- Det profilen visar i stället: vad personen faktiskt gjort.
select assert_true(
  (select activities_hosted from public_profiles
    where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 1,
  'profilen räknar genomförda aktiviteter man varit värd för');

select assert_true(
  (select member_since from public_profiles
    where id = 'aaaaaaaa-0000-4000-8000-000000000001') is not null,
  'profilen visar hur länge man varit med');

select assert_true(
  (select bankid_verified from public_profiles
    where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'profilen visar att identiteten är styrkt med BankID');
commit;

/* Anmälan — trygghet utan betyg ----------------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

insert into reports (reporter_id, reported_user_id, activity_id, reason, details)
values (auth.uid(), 'aaaaaaaa-0000-4000-8000-000000000003',
        'bbbbbbbb-0000-4000-8000-000000000001',
        'obehagligt_beteende', 'Stod för nära hela tiden.');

select assert_true(
  (select count(*) from reports) = 1,
  'man ser sin egen anmälan');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select assert_true(
  (select count(*) from reports) = 0,
  'den anmälde ser varken anmälan eller vem som gjort den');

select assert_true(
  (select count(*) from public_profiles where id = auth.uid()) = 1,
  'en anmälan syns inte på den anmäldes profil');
commit;

-- Anmälan finns, men bara för moderation (service_role / postgres).
select assert_true(
  (select count(*) from reports
    where reported_user_id = 'aaaaaaaa-0000-4000-8000-000000000003'
      and status = 'open') = 1,
  'anmälan hamnade i moderationskön');

/* "Skulle du göra om det?" ----------------------------------------------
   Kärnan i testerna nedan är att ett NEJ ska vara omöjligt att upptäcka.
   Att ett dubbelt ja syns är den lätta halvan.                            */

-- Micke (värd) och Sara var båda på fisketuren, som nu är genomförd.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  (select count(*) from rematch_prompts()
    where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001') = 2,
  'efter aktiviteten finns de andra deltagarna att svara om');

select submit_rematch('bbbbbbbb-0000-4000-8000-000000000001',
                      'aaaaaaaa-0000-4000-8000-000000000001', true);

select assert_true(
  (select count(*) from rematch_prompts()
    where activity_id = 'bbbbbbbb-0000-4000-8000-000000000001'
      and user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0,
  'den man svarat om försvinner ur frågelistan');

-- Micke har inte svarat än. Inget får synas — och framför allt inget som
-- avslöjar ATT han inte svarat.
select assert_true(
  (select count(*) from rematches()) = 0,
  'ett ensidigt ja ger ingen matchning');
commit;

-- Sara svarar nej om Johan. Det ska inte gå att upptäcka någonstans.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';
select submit_rematch('bbbbbbbb-0000-4000-8000-000000000001',
                      'aaaaaaaa-0000-4000-8000-000000000003', false);
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select assert_true(
  (select count(*) from rematch_signals) = 0,
  'Johan kan inte läsa ett enda svar som handlar om honom');

select assert_true(
  (select count(*) from rematch_prompts()
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000002') = 1,
  'Saras nej hindrar inte Johan från att få frågan om henne');

-- Johan säger ja om Sara. Hon sa nej — men han får inget veta.
select submit_rematch('bbbbbbbb-0000-4000-8000-000000000001',
                      'aaaaaaaa-0000-4000-8000-000000000002', true);

select assert_true(
  (select count(*) from rematches()) = 0,
  'ett ja mot ett nej ger ingen matchning, och ingen antydan om varför');
commit;

-- Micke svarar ja om Sara. Nu finns ett dubbelt ja.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select submit_rematch('bbbbbbbb-0000-4000-8000-000000000001',
                      'aaaaaaaa-0000-4000-8000-000000000002', true);

select assert_true(
  (select count(*) from rematches()
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000002') = 1,
  'två ja ger en matchning hos den som svarade sist');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  (select count(*) from rematches()
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 1,
  'och samma matchning hos den som svarade först');

select assert_true(
  (select count(*) from rematches()
    where user_id = 'aaaaaaaa-0000-4000-8000-000000000003') = 0,
  'den hon sa nej om dyker aldrig upp, trots att han sa ja');

select acknowledge_rematch('bbbbbbbb-0000-4000-8000-000000000001',
                           'aaaaaaaa-0000-4000-8000-000000000001');
select assert_true(
  (select count(*) from rematches()) = 0,
  'en kvitterad matchning slutar visas');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select assert_true(
  (select count(*) from rematches()) = 1,
  'men den ligger kvar hos den andra tills hen kvitterat sin');
commit;

-- En utomstående kan varken svara eller läsa.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select assert_denied(
  $$ select submit_rematch('bbbbbbbb-0000-4000-8000-000000000001',
       'aaaaaaaa-0000-4000-8000-000000000002', true) $$,
  'den som inte var med kan inte svara om någon');

select assert_true(
  (select count(*) from rematch_signals) = 0,
  'och ser inga svar alls');
commit;

/* Blockering ----------------------------------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';
insert into blocks (blocker_id, blocked_id)
values (auth.uid(), 'aaaaaaaa-0000-4000-8000-000000000001');

select assert_true(
  (select count(*) from discover_activities(59.2700, 18.1300, 50000)) = 0,
  'en blockerad värds aktiviteter försvinner ur flödet');

select assert_true(
  (select count(*) from public_profiles
    where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0,
  'en blockerad persons profil går inte att öppna');
commit;

/* Direktchatt ---------------------------------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select assert_true(
  ensure_direct_thread('aaaaaaaa-0000-4000-8000-000000000001') is not null,
  'två som varit på samma aktivitet kan öppna en direktchatt');

select assert_true(
  ensure_direct_thread('aaaaaaaa-0000-4000-8000-000000000001')
    = ensure_direct_thread('aaaaaaaa-0000-4000-8000-000000000001'),
  'samma två personer får samma tråd, inte en ny varje gång');
commit;

-- En fjärde person utan gemensam historik ska inte kunna öppna en chatt.
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-000000000004', 'ida@test');
insert into profiles (id, personal_number_hash, legal_given_name, legal_family_name,
                      birth_year, display_name, avatar_url)
values ('aaaaaaaa-0000-4000-8000-000000000004', 'hash-ida', 'Ida', 'Ros', 1992,
        'Ida', 'https://x/4.jpg');

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select assert_denied(
  $$ select ensure_direct_thread('aaaaaaaa-0000-4000-8000-000000000001') $$,
  'en främling kan inte öppna en direktchatt');
commit;

/* Lagringspolicyer ----------------------------------------------------- */
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

insert into storage.objects (bucket_id, name)
values ('avatars', auth.uid()::text || '/profil.jpg');

select assert_denied(
  $$ insert into storage.objects (bucket_id, name)
     values ('avatars', 'aaaaaaaa-0000-4000-8000-000000000001/kapad.jpg') $$,
  'man kan inte lägga en bild i någon annans avatarmapp');

select assert_denied(
  $$ insert into storage.objects (bucket_id, name)
     values ('chat-images',
             (select id from threads where kind = 'direct' limit 1)::text
             || '/aaaaaaaa-0000-4000-8000-000000000001/falsk.jpg') $$,
  'man kan inte lägga upp en chattbild i någon annans namn');
commit;

\echo ''
\echo '================================'
\echo ' Alla tester gick igenom.'
\echo '================================'
