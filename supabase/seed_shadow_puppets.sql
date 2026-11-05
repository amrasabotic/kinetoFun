-- ============================================================================
-- KinetoFun — Shadow Puppets catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'shadow-puppets',
  'Shadow Puppets',
  'Make animal shapes with your hand and watch their shadows act out stories.',
  'A lamp throws your hand''s shadow on the wall. Make a fist for a snail, point one finger for a swan, two fingers '
  'for a rabbit, first and little finger for a deer, or open your hand for a bird, and the shadow turns into that '
  'animal. Ten short stories ask each animal to go to the right spot on the wall, from a rabbit hopping to a carrot '
  'to a big show with every animal. Faster shows earn more stars; nobody fails.',
  'Make animal shapes with your hand and act out 10 shadow stories.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-purple-950 via-fuchsia-900 to-amber-800',
  '#C0659A',
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
