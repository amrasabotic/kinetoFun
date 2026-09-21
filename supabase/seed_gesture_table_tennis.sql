-- Gesture Table Tennis Arena seed
-- Run after migration 0004 (categories + status columns exist)

INSERT INTO games (
  id, title, tagline, description, category,
  players, min_players, max_players,
  cover,
  accent, rating, release_year, duration_minutes, featured,
  status, difficulty, age_group, short_description
) VALUES (
  'gesture-table-tennis',
  'Gesture Table Tennis Arena',
  'Your hand IS the paddle.',
  'Step up to the table and play real-time table tennis using only your hand! Move your hand left and right to position the paddle, raise or lower it to control height, rotate your wrist for topspin and backspin, and swing fast for powerful smashes. Battle six unique AI opponents across eight stunning arenas, each with their own playstyle. Challenge yourself with six game modes — Classic Match, Arcade Challenge with crazy modifiers, Survival Mode for endless rallies, Precision Shot for target hunting, Smash Challenge for one-minute power fests, and a full Tournament bracket. Unlock 10 paddle skins, 6 ball skins, and 7 trail effects with coins earned from epic rallies. Features real 3D ball physics with spin, bounce, and net interactions projected to a stunning perspective view.',
  'sports',
  'single', 1, 1,
  'linear-gradient(135deg, #0a0014 0%, #7c3aed 50%, #22d3ee 100%)',
  '#a855f7', 4.9, 2026, 10, true,
  'published', 'medium', '6+',
  'Gesture-controlled table tennis — move your hand, swing fast, and smash!'
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
