/*
  Kostnad per person.

  Vissa aktiviteter kostar pengar: bastun, banan, biljetten. Att inte kunna
  säga det gör att någon dyker upp utan att veta, och det är precis den
  sortens överraskning som gör att man inte kommer tillbaka. Priset ska
  synas innan man hakar på, inte vid grinden.

  Beloppet är heltal kronor. Ören förekommer inte i den här sortens
  sammanhang, och ett heltal går inte att avrunda fel.

  null betyder att det inte kostar något, vilket är det normala. Klienten
  säger då ingenting alls: att skriva ut "gratis" hade förutsatt att pris är
  normen och noll undantaget, och då blir umgänget en produkt med rabatt.

  Beloppet beskriver vad stället tar, inte vad värden tar. Inga pengar går
  via appen och ingen håvar in något. Det är hela skillnaden mellan en
  hängning och ett arrangemang, och den skillnaden ska synas i orden.
*/

alter table activities
  add column price_sek int
    check (price_sek is null or price_sek between 1 and 100000);

comment on column activities.price_sek is
  'Vad stället tar per person i hela kronor. null = kostar inget.';
