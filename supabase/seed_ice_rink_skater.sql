-- ============================================================================
-- KinetoFun — Ice Rink Skater catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'ice-rink-skater',
  'Ice Rink Skater',
  'Steer a figure skater with your hand, carve the figure, and leap for the judges.',
  'Your skater glides across the ice towards your hand. Skate the dotted figure through every flag, from a warm-up '
  'circle and a figure eight to a flower, a pretzel, a snail shell and the Champion''s Finale, and make a fist to '
  'jump over cones. Three judges hold up score cards out of ten for how true your line was; nobody falls out of the '
  'competition, and every routine reaches the end.',
  'Steer a skater by hand along figures on the ice, jump the cones, and score with the judges.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single', 1, 1,
  'from-red-600 via-amber-400 to-sky-100',
  '#E63946',
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
