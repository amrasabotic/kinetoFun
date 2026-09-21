-- ============================================================================
-- KinetoFun — Spear Stickman seed
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
  'spear-stickman',
  'Spear Stickman',
  'Aim with your hand, charge a fist, and hurl spears at waves of stickmen.',
  'Spear Stickman is a gesture-controlled arcade survival game played entirely with your hand — '
  'no keyboard, mouse, or controller. You are a stickman defender: move your hand to aim, watch the '
  'live trajectory arc, then make a fist to charge a powerful throw and open your hand to launch it '
  '(or pinch for a fast, lighter throw). Swipe sideways to dodge incoming spears. Aim for the head — '
  'headshots defeat almost any enemy instantly and score double. Survive escalating waves of eight '
  'enemy types — basic stickmen, fast runners, heavy warriors, archers, shield bearers, jumpers, '
  'teleporting ninjas — and face a giant boss every five waves with its own health bar and spear '
  'barrages. Chain kills without taking damage to build a combo up to 10x, collect power-ups that fly '
  'to you (triple spear, piercing, explosive, slow-motion, shield, rapid throw), and earn coins to '
  'unlock ten cosmetic spear skins from wood to rainbow. Battle across six hand-drawn arenas (forest, '
  'castle, desert, mountain, volcano and a night village) with four modes: Endless Survival, Time '
  'Attack, One Life and Headshots Only. Cartoon-stylized and gore-free. High scores, best wave, coins, '
  'unlocks, achievements and settings are saved locally. Every menu is gesture-driven — hover your '
  'hand over a button for a second to select it.',
  'Gesture survival: aim with your hand, fist to charge, throw spears at stickman waves. 4 modes, bosses, skins.',
  'Action',
  (select id from public.categories where slug = 'action' limit 1),
  'single',
  1,
  1,
  'from-amber-900 via-orange-900 to-stone-950',
  '#f59e0b',
  4.7,
  2026,
  10,
  'normal',
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
