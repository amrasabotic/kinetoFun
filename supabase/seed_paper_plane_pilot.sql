-- ============================================================================
-- KinetoFun — Paper Plane Pilot catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'paper-plane-pilot',
  'Paper Plane Pilot',
  'Raise your hand to climb, lower it to dive, and fly a paper plane through every hoop.',
  'A paper plane flies across a notebook-paper sky, and your hand sets its height: raise it to climb, lower it to '
  'dive, close a fist to speed up. Fly through the hoops, steer around birds, kites, balloons, rooftops, storm clouds '
  'and mountains, ride out the wind, and glide down softly onto the runway. Ten places on the flight map, from the '
  'Schoolyard to the Grand Tour; bumps only make the plane wobble, and every flight reaches the runway.',
  'Fly a paper plane by raising and lowering your hand, through hoops and onto a runway.',
  'Arcade',
  (select id from public.categories where slug = 'arcade' limit 1),
  'single', 1, 1,
  'from-amber-50 via-sky-200 to-blue-400',
  '#23365C',
  4.5, 2026, 8, 'easy', '5-12', 'published', false
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
