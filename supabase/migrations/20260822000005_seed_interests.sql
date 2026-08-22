-- FRIEND — intressekatalog
--
-- Listan är medvetet konkret. "Sport" säger ingenting om vad man faktiskt ska
-- göra på tisdag; "Fiske" gör det.

insert into interests (slug, label, emoji, sort_order) values
  ('fiske',        'Fiske',              '🎣', 10),
  ('vandring',     'Vandring',           '🥾', 20),
  ('lopning',      'Löpning',            '🏃', 30),
  ('cykling',      'Cykling',            '🚴', 40),
  ('padel',        'Padel',              '🎾', 50),
  ('fotboll',      'Fotboll',            '⚽', 60),
  ('golf',         'Golf',               '⛳', 70),
  ('gym',          'Gym & träning',      '🏋️', 80),
  ('bad',          'Bad & kallbad',      '🏊', 90),
  ('paddling',     'Paddling & kajak',   '🛶', 100),
  ('skidor',       'Skidor & snö',       '⛷️', 110),
  ('svamp',        'Svamp & bär',        '🍄', 120),
  ('tradgard',     'Trädgård & odling',  '🌱', 130),
  ('matlagning',   'Matlagning',         '🍳', 140),
  ('fika',         'Fika',               '☕', 150),
  ('middag',       'Middag & krog',      '🍽️', 160),
  ('bradspel',     'Brädspel',           '🎲', 170),
  ('tvspel',       'TV-spel',            '🎮', 180),
  ('musik',        'Musik & konsert',    '🎵', 190),
  ('film',         'Film & bio',         '🎬', 200),
  ('bocker',       'Böcker',             '📚', 210),
  ('foto',         'Foto',               '📷', 220),
  ('konst',        'Konst & museum',     '🎨', 230),
  ('bygga',        'Bygga & meka',       '🔧', 240),
  ('motor',        'Motor & bil',        '🚗', 250),
  ('hundar',       'Hundpromenad',       '🐕', 260),
  ('foraldrar',    'Föräldraliv',        '👶', 270),
  ('sprak',        'Språkutbyte',        '🗣️', 280),
  ('teknik',       'Teknik & kod',       '💻', 290),
  ('loppis',       'Loppis & fynd',      '🛍️', 300)
on conflict (slug) do update
  set label = excluded.label,
      emoji = excluded.emoji,
      sort_order = excluded.sort_order;
