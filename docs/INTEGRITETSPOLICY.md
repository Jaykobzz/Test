# Integritetspolicy för Haka på

**Utkast. Måste läsas igenom och godkännas av Jakob innan den publiceras, och
den behöver en publik adress för att App Store ska släppa igenom appen.**

Den här texten är skriven utifrån vad appen faktiskt gör, avläst ur schemat i
`supabase/migrations/`, inte utifrån en mall. Ändras datamodellen ska den här
texten ändras samtidigt, annars beskriver den snart en app som inte finns.

Senast ändrad: 2026-08-22

---

## Kort version

Vi sparar det du själv fyller i, ungefär var du bor, och det du skriver till
andra i appen. Vi säljer ingenting vidare, visar inga annonser och spårar dig
inte utanför appen. Din exakta adress lämnar aldrig din telefon, och du kan
radera allt inifrån appen när du vill.

## Vem som ansvarar

[JAKOBS NAMN ELLER FÖRETAGSNAMN], [ORGANISATIONSNUMMER], [ADRESS].
Frågor: [E-POSTADRESS].

Fyll i det här innan publicering. En integritetspolicy utan en identifierbar
avsändare är inte giltig enligt GDPR.

## Vad vi sparar och varför

**Det du fyller i själv.** Namn, en kort presentation, en profilbild och dina
intressen. Det behövs för att andra ska kunna avgöra om de vill träffa dig,
och det är därför bilden är obligatorisk.

**Ungefär var du bor.** Vi sparar en koordinat och ett områdesnamn, till
exempel Skarpnäck. Koordinaten används bara för att räkna ut avstånd till
aktiviteter. **Andra ser aldrig din koordinat, bara områdesnamnet och ett
ungefärligt avstånd.**

**Ditt födelseår**, för att kunna visa ungefärlig ålder och tillämpa
åldersgränser. Vi visar aldrig ditt exakta födelsedatum.

**Aktiviteter och ansökningar.** Det du lägger upp, det du hakar på och den
rad du skriver när du ansöker.

**Meddelanden.** Det du skriver i chattar, inklusive bilder, platser och
listor. Meddelanden är inte krypterade så att bara du och mottagaren kan läsa
dem; de ligger i vår databas och kan läsas av oss om en anmälan kräver det.

**Anmälningar och blockeringar.** Om du anmäler någon sparas anmälan, vem som
gjorde den och varför. Anmälningar står kvar även om den anmälde raderar sitt
konto, eftersom de annars vore meningslösa. Blockeringar syns aldrig för den
som blivit blockerad.

## Vad vi inte sparar

**Ditt personnummer sparas aldrig i klartext.** Om och när vi använder BankID
sparas bara en envägshashning av numret, vilket räcker för att känna igen dig
vid nästa inloggning men inte går att räkna baklänges till ett personnummer.

**Ingen exakt position i realtid.** Appen frågar efter din position när du
lägger upp något, men sparar bara den plats du valt för aktiviteten.

**Inga annonsidentifierare, ingen spårning mellan appar, inga
tredjepartsanalysverktyg.**

## Vem som ser vad

| Uppgift | Vem ser den |
|---|---|
| Namn, bild, presentation, intressen | Alla som kan se dig i appen |
| Områdesnamn och ungefärligt avstånd | Alla som kan se dig i appen |
| Ungefärlig ålder | Alla som kan se dig i appen |
| Exakt hemkoordinat | Ingen. Används bara för avståndsberäkning |
| Födelsedatum | Ingen |
| Meddelanden | De som är med i samma chatt |
| Anmälningar | Bara du och vi |
| Personnummer | Ingen, sparas aldrig i klartext |

Aktiviteter du lägger upp för kompisar syns bara för dina kompisar. Det
styrs i databasen och inte bara i appen, så en manipulerad app kommer inte åt
dem heller.

## Rättslig grund

Vi behandlar dina uppgifter för att kunna leverera tjänsten du bett om, vilket
är avtal enligt artikel 6.1 b i GDPR. Anmälningar och blockeringar behandlas
med stöd av berättigat intresse, artikel 6.1 f, eftersom en tjänst där folk
träffas fysiskt behöver kunna hantera olämpligt beteende.

## Hur länge

Så länge du har ett konto. Raderar du kontot tas dina uppgifter bort direkt.

Två undantag, och de är medvetna:

**Meddelanden du skickat blir kvar hos mottagarna**, men utan avsändare. Det
beror på att någon annans chatthistorik inte ska få hål i sig när du lämnar.

**Anmälningar mot dig står kvar**, utan koppling till dig som person. Det som
återstår är att en anmälan gjorts, av vem och varför.

## Radera ditt konto

I appen, under Profil, längst ned: **Radera mitt konto**. Det sker direkt.
Aktiviteter du är värd för ställs in så att de som tackat ja får veta, i
stället för att bara försvinna.

## Dina rättigheter

Du har rätt att få veta vad vi sparar om dig, få det rättat, få det raderat,
och att invända mot behandlingen. Hör av dig till [E-POSTADRESS].

Är du inte nöjd med hur vi hanterar dina uppgifter kan du klaga hos
Integritetsskyddsmyndigheten, imy.se.

## Var uppgifterna finns

I Supabase databaser inom EU, [BEKRÄFTA REGION VID UPPSÄTTNING: planen är
Frankfurt, eu-central-1]. Inga uppgifter förs över utanför EU och EES.

## Ändringar

Ändras den här texten meddelas det i appen innan ändringen börjar gälla.

---

## Att göra innan publicering

1. Fyll i namn, organisationsnummer, adress och e-postadress
2. Bekräfta att Supabase-projektet ligger i EU
3. Lägg texten på en publik adress, till exempel `hakapa.se/integritet`
4. Lägg in adressen i App Store Connect och i appen, på inloggningsskärmen
   och i profilen
5. Skriv användarvillkoren, som är en egen text och inte samma sak

Det här är ett utkast från en läsning av koden, inte juridisk rådgivning. Är
tveksamheten stor är en timme hos någon som kan GDPR billigare än en
avvisning från App Store.
