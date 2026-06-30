-- Gesture Snake Arena seed
-- Run after migration 0004 (categories + status columns exist)

INSERT INTO games (
  id, title, tagline, description, category,
  players, min_players, max_players,
  cover,
  accent, rating, release_year, duration_minutes, featured,
  status, difficulty, age_group, short_description
) VALUES (
  'gesture-snake-arena',
  'Gesture Snake Arena',
  'Grow. Hunt. Survive.',
  'Control a colorful snake using only your hand movements in this gesture-powered arena battle! Steer with your hand, speed up by moving further from center, and make a fist to boost. Collect glowing energy orbs to grow longer, trap AI opponents to destroy them and absorb their energy. 20 intelligent AI snakes with unique behaviors, 6 power-ups, combo system, quest missions, cosmetic unlocks, and 8 themed environments keep every session fresh. How long can you survive as the largest snake in the arena?',
  'action',
  'single', 1, 1,
  'linear-gradient(135deg, #1a3a1a 0%, #5EED7A 50%, #00F5FF 100%)',
  '#5EED7A', 4.8, 2026, 15, true,
  'published', 'medium', '8+',
  'Gesture-controlled snake arena — grow, trap opponents, and dominate!'
)
ON CONFLICT (id) DO UPDATE SET
  title             = EXCLUDED.title,
  tagline           = EXCLUDED.tagline,
  description       = EXCLUDED.description,
  featured          = EXCLUDED.featured,
  status            = EXCLUDED.status,
  short_description = EXCLUDED.short_description,
  difficulty        = EXCLUDED.difficulty,
  age_group         = EXCLUDED.age_group;
