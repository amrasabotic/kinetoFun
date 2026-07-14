-- ============================================================================
-- KinetoFun — The Sniper Code seed
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
  'the-sniper-code',
  'The Sniper Code',
  'A gesture-only marksman game — aim, wait, and take the perfect shot.',
  'The Sniper Code is a gesture-controlled sniper game played entirely with your hand — no '
  'keyboard, mouse, or controller. Look down a realistic scope and pan across the scene by '
  'moving your hand; the crosshair stays centred while the world drifts beneath it. '
  'Pinch your thumb and index finger together to fire, hold an open palm to cycle 2x / 4x / 8x '
  'zoom, and keep your hand perfectly still to engage STEADY AIM for less sway and bonus points. '
  'Each mission gives you a clear objective: eliminate the suspect marked with a red diamond, '
  'protect a VIP from an approaching attacker, stop a runner before they escape, lead a moving '
  'target, or pick the right suspect out of a busy crowd — all while sparing every civilian. '
  'A 14-mission campaign ramps up with farther targets, night, fog, crosswind, decoys, tighter '
  'timers and limited ammo across six hand-drawn environments (downtown, park, harbor, station, '
  'construction site and night rooftops). Hit-zones reward precision: headshots score double, '
  'clean streaks build a combo multiplier up to 5x, and every mission is rated up to three stars. '
  'An Endless mode delivers escalating waves for score-attack runs. Family-friendly, stylized, '
  'gore-free hit effects throughout. Progress, stars, settings and best scores are saved locally. '
  'All menus are gesture-driven — hover your hand over a button for one second to select it.',
  'Gesture-only sniper: aim with your hand, pinch to fire, palm to zoom. 14 missions + Endless.',
  'Action',
  (select id from public.categories where slug = 'action' limit 1),
  'single',
  1,
  1,
  'from-slate-900 via-red-900 to-slate-950',
  '#dc2626',
  4.7,
  2026,
  12,
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
