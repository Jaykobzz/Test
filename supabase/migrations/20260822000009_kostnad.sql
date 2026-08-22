/*
  Kostnad per person.

  Vissa aktiviteter kostar pengar: bastun, banan, biljetten. Att inte kunna
  säga det gör att någon dyker upp utan att veta, och det är precis den
  sortens överraskning som gör att man inte kommer tillbaka. Priset ska
  synas innan man hakar på, inte vid grinden.

  Beloppet är heltal kronor. Ören förekommer inte i den här sortens
  sammanhang, och ett heltal går inte att avrunda fel.

  null betyder gratis, och det är ett val värden gör, inte något som blir
  kvar av glömska: klienten frågar uttryckligen "kostar det något?". Därför
  går det att skriva ut "Gratis" utan att ljuga.
*/

alter table activities
  add column price_sek int
    check (price_sek is null or price_sek between 1 and 100000);

comment on column activities.price_sek is
  'Kostnad per person i hela kronor. null = gratis, valt av värden.';
