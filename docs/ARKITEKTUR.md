# Arkitektur

## Lagren

```
mobile/app/          expo-router — en fil per skärm
mobile/src/api/      backend-gränssnittet + två implementationer
mobile/src/auth/     inloggningstillstånd och BankID-pollning
mobile/src/components/  UI-grunder
mobile/src/lib/      geo, tid, bild, plats

supabase/migrations/ schema, funktioner, RLS, lagring
supabase/functions/  edge functions (BankID)
supabase/tests/      beteendetester mot riktig Postgres
```

## Backend-gränssnittet

`src/api/backend.ts` beskriver allt appen kan göra. Två klasser uppfyller det:

- `MockBackend` — allt i minnet, speglat till AsyncStorage. Ingen server.
- `SupabaseBackend` — riktig databas, RLS, BankID, realtidschatt.

Valet sker en gång i `src/api/index.ts` utifrån
`EXPO_PUBLIC_USE_MOCK_BACKEND`. Ingen skärm importerar någon av dem direkt.

Poängen är inte att kunna byta databas. Poängen är att man ska kunna klicka
igenom hela appen innan någon backend finns, och att mocken tvingar fram ett
gränssnitt där affärslogiken inte råkar hamna i UI-koden.

**Mockens regler speglar databasens med flit.** Ändrar du en regel på ena
sidan måste den andra följa med, annars beter sig appen olika beroende på
läge. De ställen där det gäller är märkta i koden.

## Datamodellen

```
profiles ──┬──< activities ──< activity_participants
           │         │
           │         └──── threads ──< thread_members
           │                  │
           │                  └──< messages
           │
           ├──< ratings ──── safety_flags
           ├──< friendships   (BFF, ett par = en rad)
           ├──< blocks
           └──< reports
```

Några val värda att känna till:

**`threads.activity_id` är unik och nullbar.** En aktivitet har högst en
chattgrupp; en direktchatt har ingen aktivitet. `check`-villkoret
`activity_thread_shape` ser till att formen alltid är en av de två.

**Chattgruppen skapas lat.** `ensure_activity_thread()` anropas först när
värden accepterar sin första deltagare. En aktivitet ingen hakat på har ingen
tom tråd liggande.

**Vänskap lagras som ett par, inte två rader.** Ett unikt index på
`(least(a,b), greatest(a,b))` gör spegelvända dubbletter omöjliga.
`request_bff()` känner igen en förfrågan åt andra hållet och tolkar den nya
som ett ja.

**Positioner har både lat/lng och en genererad `geography`-kolumn.** Klienten
läser talen; databasen använder `geog` med GiST-index för `ST_DWithin`.

## Behörighetsmodellen

Tre lager, i den ordningen:

1. **Kolumngrants.** `authenticated` får bara `update` på de profilfält
   användaren äger. Personnummerhash och BankID-verifiering går inte att röra
   ens på sin egen rad.
2. **RLS-policies.** Vem som ser vilken rad. Predikaten
   (`can_see_activity`, `is_thread_member`, `are_bffs` …) är `security definer`
   just för att policies annars skulle läsa samma tabell de skyddar och ge
   oändlig rekursion.
3. **RPC:er.** Allt som har regler — ansöka, acceptera, betygsätta, bli BFF —
   går genom en funktion som validerar först. Tabellerna saknar därför
   insert-policies för de operationerna. Det är avsiktligt.

`public_profiles` är en vy med `security_invoker = false`. Den kringgår RLS på
`profiles` med flit: RLS där släpper bara igenom din egen rad, och vyn är den
kontrollerade kanal som visar ett beskuret urval av andras. Radfiltret i vyn
(avstängda konton, blockeringar, kräver inloggning) gör jobbet som RLS annars
gjort.

## Inloggningsflödet

```
appen              bankid-auth (edge)            Supabase auth
  │                       │                           │
  ├─ POST /start ────────▶│                           │
  │                       ├─ provider.start()         │
  │◀─ orderRef ───────────┤                           │
  │                       │                           │
  ├─ POST /collect ──────▶│  (pollas var 1,2 s)       │
  │                       ├─ provider.collect()       │
  │                       ├─ HMAC(personnummer)       │
  │                       ├─ hitta/skapa användare ──▶│
  │                       ├─ generateLink() ─────────▶│
  │◀─ tokenHash ──────────┤                           │
  │                                                   │
  ├─ verifyOtp(tokenHash) ───────────────────────────▶│
  │◀─ session ────────────────────────────────────────┤
```

Service-nyckeln lämnar aldrig edge-funktionen. Klienten får ett engångstoken
som den själv växlar mot en session.

Skapas en användare men profilen misslyckas rullas auth-användaren tillbaka.
Annars vore personnummerhashen upptagen av ett konto utan profil, och personen
hade låsts ute för alltid.

Sessionen ligger i SecureStore (Keychain / EncryptedSharedPreferences), inte
AsyncStorage. Adaptern i `src/api/supabase/client.ts` delar värdet i bitar
eftersom SecureStore tar max ~2 kB och en Supabase-session är större.

## Betygsmodellen

Två stjärnfrågor och en trygghetsfråga:

| Fråga | Var den hamnar |
|---|---|
| Hur kul var det? | `ratings.fun` → publikt snitt |
| Hur trevlig var hen? | `ratings.friendliness` → publikt snitt |
| Kändes det tryggt? | `ratings.felt_safe` → `safety_flags` vid nej |

`rating_summary()` räknar `avg((fun + friendliness) / 2)`. Trygghetssvaret
ingår inte. Ett nej skapar en rad i `safety_flags`, som saknar RLS-policies
helt och därför bara är läsbar för `service_role`.

Betygsfönstret är fjorton dagar. Båda måste ha varit på aktiviteten på riktigt
— värd eller accepterad deltagare — och aktiviteten måste vara slut.

`ratings` har bara en select-policy: `rater_id = auth.uid()`. Du ser vad du
själv satt, aldrig vad andra satt på dig.

## Att lägga till något

**Ett nytt meddelandeslag** — lägg till i `message_kind`, utöka
`message_shape`-villkoret, lägg till i `SendMessageInput` och rendera i
`MessageBubble`.

**Ett nytt filter i flödet** — parameter i `discover_activities`,
motsvarande filtrering i `MockBackend.discover`, och en chip-rad i
`app/(tabs)/index.tsx`.

**Ett nytt intresse** — båda ställena: `supabase/migrations/*_seed_interests.sql`
och `mobile/src/api/interests.ts`.
