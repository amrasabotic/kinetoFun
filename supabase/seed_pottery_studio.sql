-- ============================================================================
-- KinetoFun — Pottery Studio catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'pottery-studio',
  'Pottery Studio',
  'Shape spinning clay with your fingertip, then glaze and fire your pot.',
  'Point one finger at the potter''s wheel and shape the spinning clay: push in to make it thinner and taller, '
  'pull out to make it wider. Each of the 12 pots has a gold outline to match, from a tall cup to a grand vase, '
  'and earns up to three stars for how closely it fits. Finished pots are glazed in six colours and three patterns, '
  'fired in the kiln and kept on your shelf. A free studio has no outline at all.',
  'Shape spinning clay with your fingertip to match 12 pots, then glaze and fire them.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-orange-900 via-amber-800 to-rose-900',
  '#E3954F',
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
