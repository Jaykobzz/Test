-- FRIEND — intressekatalog
--
-- Listan är medvetet konkret. "Sport" säger ingenting om vad man faktiskt ska
-- göra på tisdag; "Fiske" gör det.
--
-- Ikonerna är namn på linjeikoner i klientens ikonset, inte emoji. Emoji ser
-- olika ut på varje plattform, går inte att färgsätta med temat och drar ner
-- hela gränssnittet en klass.

insert into interests (slug, label, icon, sort_order) values
  ('fiske',        'Fiske',                 'fish-outline', 10),
  ('vandring',     'Vandring',              'trail-sign-outline', 20),
  ('lopning',      'Löpning',               'walk-outline', 30),
  ('cykling',      'Cykling',               'bicycle-outline', 40),
  ('padel',        'Padel',                 'tennisball-outline', 50),
  ('fotboll',      'Fotboll',               'football-outline', 60),
  ('golf',         'Golf',                  'golf-outline', 70),
  ('gym',          'Gym & träning',         'barbell-outline', 80),
  ('bad',          'Bad & kallbad',         'water-outline', 90),
  ('paddling',     'Paddling & kajak',      'boat-outline', 100),
  ('skidor',       'Skidor & snö',          'snow-outline', 110),
  ('svamp',        'Svamp & bär',           'leaf-outline', 120),
  ('tradgard',     'Trädgård & odling',     'flower-outline', 130),
  ('matlagning',   'Matlagning',            'restaurant-outline', 140),
  ('fika',         'Fika',                  'cafe-outline', 150),
  ('middag',       'Middag & krog',         'wine-outline', 160),
  ('bradspel',     'Brädspel',              'dice-outline', 170),
  ('tvspel',       'TV-spel',               'game-controller-outline', 180),
  ('musik',        'Musik & konsert',       'musical-notes-outline', 190),
  ('film',         'Film & bio',            'film-outline', 200),
  ('bocker',       'Böcker',                'book-outline', 210),
  ('foto',         'Foto',                  'camera-outline', 220),
  ('konst',        'Konst & museum',        'color-palette-outline', 230),
  ('bygga',        'Bygga & meka',          'hammer-outline', 240),
  ('motor',        'Motor & bil',           'car-sport-outline', 250),
  ('hundar',       'Hundpromenad',          'paw-outline', 260),
  ('foraldrar',    'Föräldraliv',           'people-outline', 270),
  ('sprak',        'Språkutbyte',           'chatbubbles-outline', 280),
  ('teknik',       'Teknik & kod',          'code-slash-outline', 290),
  ('loppis',       'Loppis & fynd',         'pricetag-outline', 300)
on conflict (slug) do update
  set label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
