# FRIEND

Få med dig folk på det du ändå ska göra.

Du lägger upp *Fiska i Drevviken 13–15* och folk i området ansöker om att haka
på. Du väljer vilka du säger ja till. De du accepterar hamnar direkt i en
chattgrupp med dig, där ni kan skicka bilder, kartnålar och listor inför det ni
ska göra.

Efteråt får ni frågan om ni vill göra om det. Vill båda det hörs ni av — vill
bara den ena det händer ingenting alls, och ingen får veta. Gör ni om det
tillräckligt många gånger har ni blivit kompisar. Det är ordningen: **aktiviteten
är produkten, kompisarna är vad som växer ur den.**

Alla är verifierade med BankID. Inga anonyma konton, inga profiler utan bild.
Och ingen betygsätter någon — se nedan.

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
git clone -b claude/repo-assessment-h6zbod https://github.com/Jaykobzz/Test.git
cd Test/mobile
npm install
npx expo start
```

> Branchen måste anges. Appen ligger inte på `main` än — `main` innehåller bara
> repots gamla filer och designpaketet.

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
RLS påslagen — ansöka, acceptera, chatta, svara på "göra om det?", anmäla,
blockera. Flera av testerna finns enbart för att bevisa att ett nej är omöjligt
att upptäcka.

Kräver `postgresql-16` och `postgresql-16-postgis-3`.

---

## Hur det hänger ihop

```
Ansökan ──accepteras av värden──▶ Chattgrupp ──slut──▶ "Göra om det?"
                                       │                      │
                                       │              båda ja │ (annars ingenting,
                                       │                      │  och ingen får veta)
                                       │                      ▼
                                       └──────────────▶  Boka in nästa
                                          chatten kvar        │
                                                              ▼
                                                        Kompisförfrågan
                                                              │
                                                              ▼
                                              Aktiviteter bara för kompisar
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

**Ingen betygsätter någon.** Det fanns ett stjärnsystem tidigare i utvecklingen
och det är borttaget med flit. Ett betyg mäter hur väl två personer passade
ihop, men läses av alla andra som en egenskap hos den ena — och en låg siffra
följer med personen överallt. I en app vars hela syfte är att sänka tröskeln
för att höra av sig blir det ett permanent utestängningsverktyg riktat mot dem
som behöver den mest. Profilen visar i stället fakta: BankID-verifierad, antal
genomförda aktiviteter, medlem sedan. Trygghet hanteras som anmälan — privat,
granskad av människa, aldrig synlig på någons profil.

**Ett nej gör ingenting.** Efter en aktivitet får var och en frågan om de vill
göra om det med de andra. Svaret är privat. Ett ja mot ett nej ger ingenting,
och den som sagt nej får aldrig veta att någon sagt ja om hen. Eftersom en
matchning bara uppstår när båda svarat går det heller aldrig att avgöra om
tystnaden betyder nej eller bara att svaret dröjer — därför säger appen aldrig
"ingen matchning" eller "väntar på svar". Den tvetydigheten är skyddet som gör
att man vågar svara ärligt.

**Reglerna bor i databasen.** Vem som får acceptera en ansökan, vem som får
läsa en tråd, vem som får öppna en chatt — allt är RLS-policies och RPC:er.
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
- **Moderationsverktyg.** `reports` fylls på korrekt, men det finns ingen vy
  att beta av kön i.
- **Bjuda in någon direkt till en ny aktivitet.** Efter en matchning öppnas en
  chatt där man får komma överens själv; appen kan inte skicka en inbjudan.
- **Listor på Android.** `Alert.prompt` finns bara på iOS; Android behöver ett
  eget litet formulär.

Mer i [`docs/ARKITEKTUR.md`](docs/ARKITEKTUR.md).
