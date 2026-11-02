-- ============================================================================
-- KinetoFun — Sunset Rally catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'circuit-racer',
  'Sunset Rally',
  'Race five rivals at sunset: your hand is the steering wheel.',
  'The car drives itself and sits wherever your hand is across the road: move your hand left or right to dodge traffic, grab coins and overtake. Make a fist for a nitro boost, refilled by blue cans on the road. Eight roads from a gentle palm coast to a winding Grand Prix, each with five rivals; finish first for three stars. The race pauses whenever the camera loses your hand.',
  'Steer a racing car with your hand and make a fist for nitro, across eight sunset roads.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single', 1, 1,
  'from-purple-900 via-pink-600 to-orange-400',
  '#FF4D6D',
  4.6, 2026, 8, 'easy', '5-12', 'published', false
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
