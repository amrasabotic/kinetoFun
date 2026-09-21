-- ============================================================================
-- KinetoFun — Gesture Tetris game seed
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
  'gesture-tetris',
  'Gesture Tetris',
  'Tilt your hand to guide falling blocks — no controller needed.',
  'Classic Tetris reimagined for gesture control. '
  'All seven tetrominoes fall across a 10×20 grid, and your hand is the controller: '
  'tilt your wrist left or right to slide pieces, raise your hand to rotate clockwise, '
  'and push your hand down to soft-drop at 8× speed. '
  'A ghost piece shows exactly where your block will land, and satisfying Web Audio sound '
  'effects mark every move, rotate, lock, and line clear. '
  'Three difficulty levels set your starting speed — Easy begins at level 1, Normal at level 3, '
  'Hard at level 6. Score multiplies with your current level and sky-rockets on Tetris clears. '
  'All menus are navigated by hovering your hand and dwelling — no mouse or keyboard required.',
  'Classic Tetris fully controlled by hand gestures: tilt to move, raise to rotate, lower to drop fast.',
  'Arcade',
  (select id from public.categories where slug = 'arcade' limit 1),
  'single',
  1,
  1,
  'from-cyan-600 via-blue-600 to-violet-700',
  '#06b6d4',
  4.6,
  2026,
  15,
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
