-- ============================================================================
-- KinetoFun — Gesture Love Balls seed
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
  'gesture-love-balls',
  'Gesture Love Balls',
  'Draw paths with your hand to reunite two lovesick balls.',
  'Gesture Love Balls is a gesture-powered physics puzzle game inspired by Love Balls. '
  'Two balls — one blue, one pink — are separated across each level by walls, platforms, '
  'and devious obstacles. Your mission is to bring them together by drawing lines and shapes '
  'using only your hand movements. '
  'Pinch your thumb and index finger together and move your hand to draw a line in mid-air. '
  'When you release the pinch, the line solidifies into a rigid physics object that the balls '
  'can roll down, bounce off, or slide along. Guide them to touch and watch the hearts fly! '
  'Features 30 handcrafted levels with increasing complexity — from simple bridges across '
  'a gap to multi-obstacle gauntlets with moving platforms, rotating beams, and deadly spikes. '
  'An ink meter limits each drawing session, rewarding elegant solutions with up to 3 stars. '
  'All menus and in-game controls work entirely through gesture: hover your hand cursor over '
  'any button for one second to activate it. Make a fist to reset your drawings. No keyboard, '
  'no mouse — pure gesture-based play. Progress, star ratings, and best scores are saved locally.',
  'Draw lines with your hand to connect the two lovesick balls — 30 gesture-only physics puzzles.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-purple-600 via-pink-500 to-purple-800',
  '#a855f7',
  4.7,
  2026,
  15,
  'easy',
  '5+',
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
