# FRIEND — ikonsystem

Ett eget set, inte ett bibliotek. Skälet är enkelt: ett generiskt ikonpaket
läser som *default*, och default är den tydligaste signalen att ingen har ritat
gränssnittet.

## Konstruktionsregler

| | |
|---|---|
| Rutnät | 24 × 24 |
| Levande yta | 20 × 20 (2 enheters marginal runt om) |
| Streck | 1,7 |
| Ändar och hörn | Runda, alltid |
| Fyllning | Ingen. Rent streck genom hela setet. |
| Diagonaler | 45° där det går |
| Max antal streck | 3 per ikon |
| Minsta detalj | 3 enheter |

De två sista raderna är de viktigaste och de enda som är svåra att hålla.

Ikonerna renderas i chips vid **14 px** och i rader vid 15–17 px. På 14 px är
en enhet på rutnätet 0,58 riktiga pixlar. Allt som är mindre än tre enheter
blir gröt. Det är därför en tärning har tre prickar och inte fem, och därför
handkontrollen saknar knappar — inte för att det är snyggare, utan för att
detaljerna ändå inte överlever nedskalningen.

## Formspråk

Runda ändar och generösa radier. Setet ska kännas tecknat av en människa med
stadig hand, inte genererat ur en geometrisk mall — men aldrig gulligt. Där en
form *kunde* vara en rektangel är den en rundad form; där ett streck *kunde*
sluta tvärt slutar det runt.

Ingen ikon fylls. En fylld form mitt i ett streckat set drar till sig blicken
av fel skäl och tvingar fram fyllda varianter av allt annat.

## Verifiering

Ikonerna renderas till en kontaktkarta i tre storlekar — 48, 24 och 14 px —
med `design/icons/render.py`. Testet är den minsta storleken: går ikonen inte
att skilja från grannen vid 14 px är den fel, hur fin den än är stor.

## Arbetsgång

```
design/icons/icons.json      enda källan — banorna bor här
        │
        ├── render.py    →   sheet-48/24/14.png   för granskning
        └── generate.py  →   mobile/src/components/icons/paths.ts
```

Redigera aldrig `paths.ts` för hand. Ändra banan i `icons.json`, kör
`render.py`, titta på 14 px-arket, och kör sedan `generate.py`.

## Vad som ännu inte är ritat

De trettio intresseikonerna är klara. Gränssnittets egna ikoner — plus,
chevron, sköld, lås, kamera, kryss och ett trettiotal till — ligger fortfarande
på Ionicons.

Det är ett medvetet mellanläge, inte ett förbiseende. Intresseikonerna syns
som ett *set*, sida vid sida i väljaren och i flödets filterrad, och det är där
ett generiskt bibliotek syns tydligast. Gränssnittsikonerna uppträder en och en
och tål att vänta. Ionicons streckvikt ligger nära 1,6 vid 24 px, så
skillnaden är liten tills resten är ritad — men den finns, och setet är inte
färdigt förrän den är borta.

## Ursprung

Setet i `icons.json` kommer från Claude Designs handoff-paket
(`Mobile app design project.zip` på `main`, riktning "Bryggan"), med två byten.

De två seten ritades oberoende av varandra och landade i samma konstruktion —
24-rutnät, runda ändar, ingen fyllning. Deras var jämnare i kurvorna och hade
31 ikoner mot våra 30, inklusive `handarbete` (sy, sticka, brodera och virka
samlat som en aktivitet). Därför blev deras grunden.

Två ikoner behölls eller ritades om:

| Ikon | Varför |
|---|---|
| `svamp` | Deras var ett löv. Kategorin heter "Svamp & bär" — vår svamp stannar. |
| `vandring` | Deras skyltstolpe lästes som ett P. Omritad till en bergskam. |

`design-sheet-48.png` och `design-sheet-14.png` är renderingar av deras
ursprungliga set och ligger kvar som jämförelse.

Streckvikten är nu **1,7**, deras värde. Vår Icon-komponent justerar den
optiskt mot storleken — se `mobile/src/components/icons/Icon.tsx`.
