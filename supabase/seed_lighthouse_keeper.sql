-- ============================================================================
-- KinetoFun — Lighthouse Keeper catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'lighthouse-keeper',
  'Lighthouse Keeper',
  'Shine the lighthouse beam with your hand and guide boats home through the night.',
  'It is a dark night at sea. Your hand moves the lighthouse beam, and every boat inside the light sails towards it, '
  'while boats in the dark drop anchor and wait. Lead each boat along the blinking buoys, past rocks and patrolling '
  'whales, and into the harbour. Ten nights add more boats at once, fog that shrinks the light and storm currents. '
  'Bumping into something costs stars, but no boat is ever lost.',
  'Guide boats home through a dark sea with a lighthouse beam you move by hand.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-slate-950 via-blue-950 to-amber-700',
  '#F0C75A',
  4.5, 2026, 10, 'easy', '5-12', 'published', false
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
