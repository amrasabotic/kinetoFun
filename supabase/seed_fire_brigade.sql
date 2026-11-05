-- ============================================================================
-- KinetoFun — Fire Brigade catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'fire-brigade',
  'Fire Brigade',
  'Aim the hose with your hand, put out fires and rescue pets.',
  'Fires break out in a cut-away building. Point your hand at a burning room to aim the fire engine''s hose, open '
  'your hand to spray and make a fist to stop and let the tank refill. Big fires spread to the rooms next door, '
  'so tackle them early. Pets wave from the windows: put out their fire, then hold the hose on them until the '
  'ladder brings them down. Ten shifts go from a small house to a skyscraper, and a second player can raise a '
  'hand to drive the other engine.',
  'Put out fires and rescue pets across 10 shifts, alone or with a friend.',
  'Action',
  (select id from public.categories where slug = 'action' limit 1),
  'both', 1, 2,
  'from-red-700 via-orange-600 to-amber-400',
  '#D8282A',
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
