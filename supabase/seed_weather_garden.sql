-- ============================================================================
-- KinetoFun — Weather Garden catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'weather-garden',
  'Weather Garden',
  'Be the weather: sunshine from an open hand, rain from a fist, wind from a swipe.',
  'Hold your open hand over a plant to shine on it, squeeze a fist to rain on it, and swipe fast to blow hungry bugs '
  'away. Every plant wants its own mix: cactuses love sun and hate rain, ferns want shade and water, sunflowers want '
  'plenty of both, and each plant says what it needs in a bubble. Ten gardens go from spring to winter, where the '
  'seasons dry or darken the garden faster. Every plant blooms in the end; faster gardens earn more stars.',
  'Grow a garden by hand: open hand for sun, fist for rain, swipe for wind, across four seasons.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-sky-400 via-green-500 to-yellow-400',
  '#3F9D4A',
  4.5, 2026, 8, 'easy', '4-10', 'published', false
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
