-- Haka på — intressekatalog
--
-- Listan är medvetet konkret. "Sport" säger ingenting om vad man faktiskt ska
-- göra på tisdag; "Fiske" gör det.
--
-- icon är samma sträng som slugen och pekar in i appens egna ikonset
-- (mobile/src/components/icons). Aldrig emoji: de ser olika ut på varje
-- plattform, går inte att färgsätta med temat och drar ner hela gränssnittet
-- en klass.

insert into interests (slug, label, icon, sort_order) values
  ('fiske',        'Fiske',                 'fiske', 10),
  ('vandring',     'Vandring',              'vandring', 20),
  ('lopning',      'Löpning',               'lopning', 30),
  ('cykling',      'Cykling',               'cykling', 40),
  ('skateboard',   'Skateboard',            'skateboard', 45),
  ('padel',        'Padel',                 'padel', 50),
  ('fotboll',      'Fotboll',               'fotboll', 60),
  ('golf',         'Golf',                  'golf', 70),
  ('gym',          'Gym & träning',         'gym', 80),
  ('bad',          'Bad & kallbad',         'bad', 90),
  ('paddling',     'Paddling & kajak',      'paddling', 100),
  ('skidor',       'Skidor & snö',          'skidor', 110),
  ('svamp',        'Svamp & bär',           'svamp', 120),
  ('tradgard',     'Trädgård & odling',     'tradgard', 130),
  ('handarbete',   'Handarbete',            'handarbete', 135),
  ('matlagning',   'Matlagning',            'matlagning', 140),
  ('fika',         'Fika',                  'fika', 150),
  ('middag',       'Middag & krog',         'middag', 160),
  ('bradspel',     'Brädspel',              'bradspel', 170),
  ('tvspel',       'TV-spel',               'tvspel', 180),
  ('musik',        'Musik & konsert',       'musik', 190),
  ('film',         'Film & bio',            'film', 200),
  ('bocker',       'Böcker',                'bocker', 210),
  ('foto',         'Foto',                  'foto', 220),
  ('konst',        'Konst & museum',        'konst', 230),
  ('bygga',        'Bygga & meka',          'bygga', 240),
  ('motor',        'Motor & bil',           'motor', 250),
  ('hundar',       'Hundpromenad',          'hundar', 260),
  ('foraldrar',    'Föräldraliv',           'foraldrar', 270),
  ('sprak',        'Språkutbyte',           'sprak', 280),
  ('teknik',       'Teknik & kod',          'teknik', 290),
  ('loppis',       'Loppis & fynd',         'loppis', 300)
on conflict (slug) do update
  set label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
