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
3. **RPC:er.** Allt som har regler — ansöka, acceptera, öppna en chatt, bli BFF —
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

## Varför det inte finns några betyg

FRIEND hade ett stjärnsystem tidigt: *hur kul var det*, *hur trevlig var hen*,
och en separat trygghetsfråga. Det är borttaget, och det är värt att förstå
varför — annars byggs det tillbaka av någon som tycker att det verkar
självklart.

Ett betyg mäter **passform mellan två personer**, men presenteras som en
**egenskap hos den ena**. Micke som är för tystlåten för dig är precis lagom
för någon annan. Sätter du en tvåa kodar du in "vi passade inte ihop" som "den
här personen är dålig", och siffran följer med hen till alla andra.

System som det här kollapsar dessutom alltid åt ett av två håll. Antingen ger
alla fyror och femmor av artighet, och skalan säger ingenting. Eller så biter
den — och då har appen byggt ett permanent utestängningsverktyg riktat mot
blyga och ovana människor. Alltså exakt de den finns för.

Värst var `activities.min_rating`, där en värd kunde kräva ett minsta snitt för
att någon skulle få ansöka. Det gjorde utestängningen till en produktfunktion.

### Vad som gör jobbet i stället

| Behov | Lösning |
|---|---|
| Veta vem man möter | BankID vid registrering. Ingen anonymitet. |
| Sålla bland sökande | Värden accepterar var och en för hand. |
| Bedöma en främling | Fakta på profilen: verifierad, antal genomförda aktiviteter, medlem sedan. |
| Hantera obehag | `reports` → moderation. Privat, aldrig synlig på profilen. |
| Slippa någon helt | `blocks`. Ömsesidig osynlighet, direkt. |

Filtreringen som betygen försökte göra utför värden redan, med mer kontext än
en siffra någonsin bär.

`public_profiles` innehåller därför inga omdömen alls, och testsviten har en
regressionsvakt som failar om en kolumn med `rating`, `stars`, `score` eller
`felt_safe` dyker upp någonstans i schemat.

### Vad som saknas

Stunden efter aktiviteten är tom nu. Den föreslagna ersättaren är en ömsesidig
och helt privat fråga — *"Skulle du göra om det med Sara?"* — där ett nej inte
gör någonting alls, och bara ett dubbelt ja syns, som ett BFF-förslag. Då blir
det en matchning i stället för en bedömning. Inte byggd än.

## Att lägga till något

**Ett nytt meddelandeslag** — lägg till i `message_kind`, utöka
`message_shape`-villkoret, lägg till i `SendMessageInput` och rendera i
`MessageBubble`.

**Ett nytt filter i flödet** — parameter i `discover_activities`,
motsvarande filtrering i `MockBackend.discover`, och en chip-rad i
`app/(tabs)/index.tsx`.

**Ett nytt intresse** — båda ställena: `supabase/migrations/*_seed_interests.sql`
och `mobile/src/api/interests.ts`.
