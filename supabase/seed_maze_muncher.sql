-- ============================================================================
-- KinetoFun — Maze Muncher: Gesture Edition seed
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
  'maze-muncher',
  'Maze Muncher: Gesture Edition',
  'Steer through a neon maze with nothing but your hand — no mouse, no keyboard.',
  'Maze Muncher: Gesture Edition is a fully gesture-controlled maze-chase game — every menu, gesture-driven; '
  'every move, made with your hand. Move your hand into an up/down/left/right zone around center to steer '
  'through a glowing neon maze, munching energy orbs while four original AI hunters give chase: the '
  'Chaser Drone paths straight at you, the Ambush Bot predicts where you are headed and cuts you off, the '
  'Patrol Sentinel walks a fixed loop, and the Rogue Hunter is gloriously unpredictable. Grab a power orb '
  'and the tables turn for 8 seconds — hunters flash and flee, and you can defeat them for a big combo '
  'bonus. Rare gems and treasures flicker into existence for a few seconds at a time, and a classic warp '
  'tunnel lets you cut across the arena. Ten procedurally sculpted neon sectors ramp up in enemy count, '
  'speed and aggression as you climb the levels. Every menu — Start, Settings, Pause, Game Over — is '
  'operated by hovering your hand over a button for a second, or by holding a simple pose: open palm to '
  'pause, a fist to resume, thumbs up to confirm, a victory sign to restart. Built for TVs and projectors '
  'with a full accessibility suite: high contrast, colorblind-friendly palette, large UI text, adjustable '
  'gesture sensitivity and smoothing, and one-tap camera calibration.',
  'Gesture-only neon maze chase: steer with your hand, dodge 4 AI hunters, power up to turn the tables.',
  'Action',
  (select id from public.categories where slug = 'action' limit 1),
  'single',
  1,
  1,
  'from-slate-950 via-emerald-900 to-cyan-950',
  '#39ff88',
  4.7,
  2026,
  14,
  'medium',
  '6+',
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
