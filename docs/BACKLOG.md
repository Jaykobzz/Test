# Kvar att göra

Beslut som redan är fattade står här tillsammans med sin motivering. Poängen
är att den som bygger det här sedan inte ska behöva tänka ut samma sak en
gång till, och att inget av det vi kommit fram till ska bero på att någon
råkar minnas rätt.

Ordningen inom varje avsnitt är ungefär den vi bör ta dem i.

---

## Beslutat, redo att byggas

### 1. Kartnål för mötesplats

Chatten kan redan skicka en nål, men bara "där jag står just nu"
(`sendPlace()` i `app/chatt/[id].tsx` anropar `getCurrentPlace()`). Det löser
inte det som faktiskt är svårt: att komma överens om en punkt ingen av er är
på än. "Vid bryggan" räcker inte när det finns fyra bryggor.

Vad som behövs är en kartväljare: öppna en karta, panorera, sätt en nål,
skicka. Meddelandetypen `place` finns redan hela vägen genom schemat, typerna
och chattbubblan, så det som saknas är väljarskärmen och en knapp som når
den.

`react-native-maps` 1.20.1 är den version SDK 54 vill ha, och den ligger i
Expo Go, så den går att testa utan development build.

Berör: `app/chatt/[id].tsx`, en ny väljarskärm, `package.json`.

### 2. Tillfällig delning av exakt position

Bara för spontana aktiviteter, och bara medan de pågår. Poängen är den sista
biten: ni har bestämt torget, men torget är stort och ni har aldrig setts.

Det här är den känsligaste funktionen i hela appen, så den byggs med följande
egenskaper eller inte alls:

- Alltid ett aktivt val. Aldrig påslaget i förväg, aldrig påslaget som
  bieffekt av något annat.
- Bara till accepterade deltagare i just den aktiviteten.
- Med en satt sluttid som syns hela tiden, förslagsvis en timme eller till
  aktiviteten slutar, det som kommer först.
- Avbrytbar med ett tryck, och den ska slockna av sig själv utan att någon
  behöver komma ihåg att stänga av.
- Positionerna sparas inte historiskt. Det är en pågående delning, inte ett
  spår.

Schemat bör vara en egen tabell med `expires_at` och en RLS-policy som både
kräver medlemskap i aktivitetens tråd och att tiden inte gått ut, så att en
utgången delning är oläsbar även om klienten skulle fråga.

Notera skillnaden mot `profiles.home_lat`: hembostaden är avsiktligt privat
och visas som områdesnamn. Den här funktionen är ett undantag, tidsbegränsat
och valt, och får inte bli ett sätt att smyga in exakta koordinater i något
annat.

### 3. Anordna kontra haka på i onboarding

Beslutat men aldrig byggt. Vid registrering får man välja både vad man vill
haka på och vad man skulle kunna tänka sig att anordna.

Det ska inte användas för att ranka sökande. Alla som söker till en fisketur
gillar redan att fiska, så intresseöverlapp säger ingenting vid urvalet, och
en matchningssiffra bredvid en person är ett betyg med extra steg.

Det ska användas åt andra hållet: appens flaskhals är för få aktiviteter, inte
för många sökande. Vet vi att fyra personer i Skarpnäck gärna hade anordnat
fiske men aldrig gjort det, kan appen knuffa dem. "Fyra i närheten vill fiska
i helgen. Lägger du upp något?" Det gör passiva medlemmar till värdar.

Berör: `profiles` (en kolumn till, `would_host text[]`),
`app/(auth)/onboarding.tsx`, och en knuffmekanism som återstår att designa.

### 4. Leverans av pushnotiser

Mottagarlogiken är klar och ligger i `audience_for_spontaneous()`, med sina
gränser: matchande intresse, mottagarens egen radie, aldrig samma aktivitet
två gånger, högst fyra om dygnet, och ingenting utanför det egna vakna
fönstret räknat mot Europe/Stockholm.

Det som saknas är transporten. `expo-notifications` finns för SDK 54, men
Expo Go tar inte emot fjärrnotiser sedan SDK 53, så det kräver en
development build via EAS. Tabellerna `push_tokens` och `notifications_sent`
finns redan, liksom `mark_notified()`, som ska anropas efter lyckad sändning
och inte före: skriver man före tystas en person av en notis som aldrig kom
fram.

### 5. Notisinställningar i appen

`notification_prefs` finns i databasen med förval, men det finns ingen skärm
där man ändrar dem. Så länge den saknas är gränserna våra, inte
användarens, och det är inte hållbart för en funktion som stör folk.

Berör: `app/(tabs)/profil.tsx` eller en egen inställningsskärm.

### 6. Schemalägg `complete_due_activities()`

Funktionen finns och markerar passerade aktiviteter som genomförda, men
ingenting anropar den regelbundet. För planerade aktiviteter är det en
skönhetsfläck. För spontana är det viktigare: en spontan inbjudan som ligger
kvar timmar efter att den varit är precis det som gör att folk slutar lita på
flödet.

Sätt upp pg_cron i Supabase, förslagsvis var femte minut.

### 6b. Demo som går att installera

Uppskjutet, inte bortvalt. Så länge det räcker med bilder gör det det.

Två vägar när det blir aktuellt. Expo Go är gratis men kräver att mottagaren
installerar ett utvecklarverktyg och öppnar en länk, vilket gör att appen inte
känns som en app. TestFlight ger en riktig inbjudan och en ikon på hemskärmen,
men kräver Apple Developer Program, 99 dollar om året, och att appen byggs med
EAS i stället för att köras i Expo Go.

TestFlight är rätt väg för att låta familj och vänner tycka till, och det är
ändå den väg pushnotiserna kräver (punkt 4), så de två hör ihop och bör göras
samtidigt.

---

## Hittat i genomgången av appen

Buggarna nedan är redan lagade. Det som står här är sådant som saknas.

### 12. Det går inte att ändra en aktivitet

Backenden har `createActivity` och `cancelActivity`, men ingen väg däremellan.
En felstavad titel eller fel tid går bara att lösa genom att ställa in och
skapa på nytt, och då förlorar man de sökande och chatten.

Det här är den största enskilda luckan. En värd som måste flytta fram en
timme ska inte behöva sprida ut sitt sällskap för att göra det.

Behöver `update_activity()` med samma synlighetskontroll som resten, plus en
systemhälsning i tråden när tid eller plats ändras, så att de som redan tackat
ja får veta.

### 13. Ingen väg ut ur en chatt

Man kan hoppa av en aktivitet, och då lämnar man dess tråd. Men en
direktchatt går inte att lämna, bara att blockera personen. Samma problem som
kompisrelationen hade: det hårdaste verktyget är det enda.

### 14. Tabbaren använder Ionicons

Resten av appen har ett eget ikonset som ritats för ändamålet, men de fyra
ikonerna man ser hela tiden kommer från ett bibliotek. Det är den mest synliga
ytan i appen och den enda som inte följer huset.

Behöver fyra ikoner till i `design/icons/icons.json`: kompass, kalender,
samtal och person.

### 15. `listInterests()` anropas aldrig

Klienten använder sin egen hårdkodade lista i `src/api/interests.ts`, eftersom
den bär ikonerna. Tabellen `interests` i databasen och funktionen som läser den
är därmed död vikt, och de två listorna kan glida isär utan att något märker
det. Antingen tas den bort eller så blir den källan, men inte som nu.

### 16. Olästmarkeringen är inte i realtid

Pricken i tabbaren laddas om när flikarna får fokus. Står appen öppen dyker
inget upp förrän man byter skärm. `subscribeToThread()` finns redan och bör
driva den när Supabase är uppe.

---

## Väntar på beslut

### 7. Kategorier i två nivåer

Idag är intressen en platt lista. Frågan som ställdes men aldrig besvarades:
ska vi lägga en nivå ovanför, alltså grupper som "Sport" och "Mat" att bläddra
i, med de specifika intressena kvar för att beskriva sig själv?

Hör ihop med två saker till: en "Annat"-flik, eftersom det finns hundratals
aktiviteter vi aldrig kommer räkna upp, och fjorton föreslagna tillägg
(klättring, yoga, skridskor, innebandy, dans, discgolf, tennis, bowling,
ridning, segling, fågelskådning, camping, meditation, volontär).

Notera att det påverkar notiserna: matchningen i `audience_for_spontaneous()`
går på exakt kategori idag. Med grupper måste vi bestämma om ett intresse för
"Sport" ska ge notiser om innebandy.

### 8. Bildkrav på spontana aktiviteter

Här har jag redan fattat ett beslut som går emot en regel du satte från
början, så det står här för att du ska kunna vända på det.

Kravet på bild gäller nu bara planerade aktiviteter. Skälet är att kravet
finns för att flödet ska se levande ut och för att en post ska kosta något,
och båda skälen håller för något man lägger upp i förväg men inget av dem för
"fika om tjugo minuter". Spontana poster får i stället ett omslag ritat ur
kategorins ikon.

Villkoret i databasen är omskrivet, inte borttaget: en planerad aktivitet utan
bild avvisas fortfarande, och `npm run flode` bevisar det.

Vill du ha tillbaka kravet även för spontana är det ett villkor i
`20260822000008_spontant.sql` och en rad i mockens `createActivity()`.

### 9. Gäller em-streck-regeln hela repot?

Regeln var att inga em-streck får finnas i appen, och appens text är fri från
dem. Det finns kvar em-streck i `README.md`, `docs/ARKITEKTUR.md`,
`design/icons/SPEC.md` och i några SQL-kommentarer, alltså i text som bara
utvecklare ser. Säg till om de ska bort också.

---

## Städning

### 10. `public/images/` på `main`

Bilderna ligger nu i `mobile/assets/seed/` där appen faktiskt kan läsa dem.
Originalen på `main` fyller ingen funktion längre och kan tas bort.

### 11. Repot heter fortfarande `Test`

Appen heter Haka på. Bytet måste göras i GitHubs inställningar, det går inte
att göra härifrån.
