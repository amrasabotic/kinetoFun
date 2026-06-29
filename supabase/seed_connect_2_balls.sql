-- Seed: Connect 2 Balls
-- Run in Supabase Dashboard → SQL Editor

INSERT INTO public.games (
  id,
  title,
  description,
  category,
  category_id,
  status,
  featured,
  cover,
  accent,
  difficulty,
  age_group,
  play_count
)
SELECT
  'connect-2-balls',
  'Connect 2 Balls',
  'Draw paths to connect matching coloured balls and fill the entire grid. 30 hand-crafted campaign levels, endless and daily challenge modes. Gesture-controlled — pinch to select, swipe to navigate.',
  'Puzzle',
  c.id,
  'published',
  false,
  'from-indigo-900 via-purple-900 to-pink-900',
  '#a855f7',
  'easy',
  '6+',
  0
FROM public.categories c
WHERE c.name = 'Puzzle'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  category     = EXCLUDED.category,
  category_id  = EXCLUDED.category_id,
  status       = EXCLUDED.status,
  cover        = EXCLUDED.cover,
  accent       = EXCLUDED.accent,
  difficulty   = EXCLUDED.difficulty,
  age_group    = EXCLUDED.age_group;
