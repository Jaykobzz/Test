# FRIEND

Hitta folk i närheten som vill göra samma sak som du.

Du lägger upp något du ändå ska göra — *Fiska i Drevviken 13–15* — och folk i
området ansöker om att haka på. Du väljer vilka du säger ja till. De du
accepterar hamnar direkt i en chattgrupp med dig, där ni kan skicka bilder,
kartnålar och listor inför det ni ska göra. Efteråt sätter ni betyg på
varandra, chatten finns kvar, och den ni gillade kan ni göra till BFF.

Alla är verifierade med BankID. Inga anonyma konton, inga profiler utan bild.

---

## Vad som finns

| Del | Var | Läge |
|---|---|---|
| Mobilapp (iOS + Android) | `mobile/` | Expo SDK 57, React Native 0.86, expo-router |
| Databas, RLS och RPC:er | `supabase/migrations/` | Postgres 17 + PostGIS |
| BankID-inloggning | `supabase/functions/bankid-auth/` | Mock idag, broker inkopplingsbar |
| Databastester | `supabase/tests/` | 46 påståenden, körs utan Supabase |

## Kom igång på två minuter

Appen har ett inbyggt mock-backend. Ingen server, ingen databas, inget konto —
allt sparas lokalt på telefonen med exempeldata runt södra Stockholm.

```bash
cd mobile
npm install
npx expo start
```

Skanna QR-koden med Expo Go. Logga in med **vilket tolvsiffrigt personnummer
som helst** — samma nummer ger alltid samma person, så du kan hoppa mellan två
testkonton genom att logga ut och skriva ett annat.

> Bilder och plats behöver riktiga behörigheter. Nekar du plats faller appen
> tillbaka på Drevviken som utgångspunkt.

## Med riktig backend

```bash
# 1. Skapa ett Supabase-projekt och kör migrationerna
supabase link --project-ref <ditt-ref>
supabase db push

# 2. Sätt hemligheterna för BankID-funktionen
supabase secrets set BANKID_MODE=mock \
  BANKID_ORDER_SECRET="$(openssl rand -hex 32)" \
  PNR_PEPPER="$(openssl rand -hex 32)"

# 3. Publicera edge-funktionen
supabase functions deploy bankid-auth

# 4. Peka appen mot projektet
cd mobile
cp .env.example .env   # fyll i URL och anon-nyckel, sätt USE_MOCK_BACKEND=0
```

## Bygga för App Store och Google Play

```bash
cd mobile
npx eas build --platform ios
npx eas build --platform android
```

Kräver ett Expo-konto och `eas.json`. Bundle-id och paketnamn står i
`app.json` (`se.friend.app`) och behöver bytas till något du äger.

## Testa databasen

```bash
./supabase/tests/run.sh
```

Startar en tillfällig Postgres, lägger på en attrapp av det Supabase
tillhandahåller (`auth.uid()`, `storage.foldername()`, rollerna), kör alla
migrationer och går sedan igenom hela flödet som tre riktiga användare med
RLS påslagen — ansöka, acceptera, chatta, betygsätta, blockera.

Kräver `postgresql-16` och `postgresql-16-postgis-3`.

---

## Hur det hänger ihop

```
Ansökan  ──accepteras av värden──▶  Chattgrupp  ──aktiviteten är slut──▶  Betyg
                                        │                                   │
                                        └── finns kvar efteråt              ▼
                                            (gör om, boka nytt)         BFF-förfrågan
                                                                            │
                                                                            ▼
                                                            Aktiviteter bara för BFFs
```

Att acceptera någon är den enda handling som skapar en chatt. Det är med
flit: chatten är belöningen för att någon sagt ja till dig, inte en kanal som
står öppen för vem som helst.

## Fyra beslut som styr resten

**Personnumret lagras aldrig.** BankID-funktionen HMAC-hashar det med en
serverhemlighet och sparar bara hashen. Databasen kan känna igen en
återvändande person utan att någon kan läsa numret. Hemligheten gör att ett
läckt databasutdrag inte går att brute-forcea, trots att personnummer är ett
litet sökrum.

**Din exakta position är privat.** Hempositionen grovhuggs till ett rutnät på
ungefär en kilometer innan den sparas, och andra ser aldrig koordinaterna —
bara ett områdesnamn och ett avstånd. `public_profiles` är den enda vy en
användare kan läsa andras profiler genom, och den saknar koordinatkolumner
helt.

**Trygghet är inte en publik siffra.** Betyget består av *kul* och *trevlig*.
Frågan "kändes det tryggt?" räknas inte in i snittet — ett nej skapar i
stället ett larm i `safety_flags`, som bara moderation kan läsa. Den som
betygsatts ser aldrig vem som satt vad. Ett offentligt creep-räknarverk hade
blivit ett vapen i stället för ett skydd.

**Reglerna bor i databasen.** Vem som får acceptera en ansökan, vem som får
läsa en tråd, vem som får sätta ett betyg — allt är RLS-policies och RPC:er.
Appen kan inte kringgå dem ens om klientkoden ändras, och mock-backendet
speglar samma regler så att beteendet är detsamma i båda lägena.

## Om BankID

Idag kör allt mot en mock som uppfyller samma gränssnitt som ett skarpt
BankID: `start` → `collect`-pollning → verifierad identitet. Väntetillståndet,
hintkoderna och avbrytningen finns på riktigt — bara signeringen är låtsas.

`supabase/functions/_shared/bankid/criipto.ts` är en färdig implementation mot
en riktig broker. Att växla är en rad i `resolveProvider()` plus fyra
hemligheter. Vill du gå direkt mot BankID:s eget RP-API behöver du certifikat
via en svensk bank och en juridisk person — samma gränssnitt håller ändå.

## Vad som inte är byggt än

- **Push-notiser.** En ansökan syns först när man öppnar appen.
- **Inbäddad karta.** Platser delas som nålar och öppnas i telefonens kartapp;
  det finns ingen karta inuti FRIEND.
- **Moderationsverktyg.** `safety_flags` och `reports` fylls på korrekt, men
  det finns ingen vy att beta av dem i.
- **Listor på Android.** `Alert.prompt` finns bara på iOS; Android behöver ett
  eget litet formulär.

Mer i [`docs/ARKITEKTUR.md`](docs/ARKITEKTUR.md).
