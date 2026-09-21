-- Seed: Kingdom Clash
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
  players,
  min_players,
  max_players,
  play_count
)
SELECT
  'kingdom-clash',
  'Kingdom Clash',
  'Hand-tracked castle-defense strategy. Pinch and drag unit cards — Knight, Archer, Mage, Giant — onto your half of the battlefield. Spend mana wisely to destroy the enemy castle before yours falls. 10 escalating levels.',
  'Strategy',
  c.id,
  'published',
  true,
  'from-yellow-900 via-amber-900 to-stone-950',
  '#c0a855',
  'normal',
  '8+',
  'single',
  1,
  1,
  0
FROM public.categories c
WHERE c.name = 'Strategy'
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
