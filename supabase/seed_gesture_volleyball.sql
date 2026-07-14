-- ============================================================================
-- KinetoFun — Gesture Volleyball game seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id,
  title,
  tagline,
  description,
  short_description,
  category,
  category_id,
  players,
  min_players,
  max_players,
  cover,
  accent,
  rating,
  release_year,
  duration_minutes,
  difficulty,
  age_group,
  status,
  featured
)
values (
  'gesture-volleyball',
  'Gesture Volleyball',
  'Smash and block a volleyball with your bare hands.',
  'Gesture Volleyball puts you on a sandy beach court facing a fast-reacting AI opponent. '
  'Your camera becomes the controller: move your hands left and right to slide your player '
  'across your half of the court, raise one hand high to unleash a powerful smash that '
  'rockets the ball deep into the AI side, or spread both hands wide to trigger a blocking '
  'stance that deflects incoming shots back over the net. '
  'The AI adapts to difficulty — Easy occasionally misses and moves slowly, Normal keeps '
  'you honest with moderate smashes, and Hard tracks every ball and fires aggressive slams. '
  'First player to reach 7 points wins the match. All menus are navigated by hovering '
  'your hand and dwelling — no mouse or keyboard required. '
  'Scores are saved to the leaderboard on match end.',
  'Two-hand gesture volleyball — raise to smash, spread to block, first to 7 wins.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-sky-500 via-blue-600 to-indigo-700',
  '#38bdf8',
  4.5,
  2026,
  10,
  'medium',
  '7+',
  'published',
  true
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
