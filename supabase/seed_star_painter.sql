-- ============================================================================
-- KinetoFun — Star Painter catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'star-painter',
  'Star Painter',
  'Join the stars with your fingertip and watch the constellations come alive.',
  'Your fingertip is a little wand of light. Rest it on a star to pick it up, then rest on the next star of the '
  'picture to draw a glowing line between them, in any order you like. Ten skies go from the Kite and Cassiopeia to '
  'Orion, the Dragon and the Great Whale; later skies add drifting clouds that hide stars and shooting stars to catch '
  'for a bonus. Every picture can be finished, and each one comes alive when it is complete.',
  'Draw constellations with your fingertip, catch shooting stars, and watch the night sky come alive.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-slate-950 via-indigo-950 to-amber-600',
  '#F3CF7A',
  4.5, 2026, 8, 'easy', '4-12', 'published', false
)
on conflict (id) do update set
  title             = excluded.title,
  tagline           = excluded.tagline,
  description       = excluded.description,
  short_description = excluded.short_description,
  category          = excluded.category,
  category_id       = excluded.category_id,
  players           = excluded.players,
  min_players       = excluded.min_players,
  max_players       = excluded.max_players,
  cover             = excluded.cover,
  accent            = excluded.accent,
  rating            = excluded.rating,
  release_year      = excluded.release_year,
  duration_minutes  = excluded.duration_minutes,
  difficulty        = excluded.difficulty,
  age_group         = excluded.age_group,
  status            = excluded.status,
  featured          = excluded.featured,
  updated_at        = now();
