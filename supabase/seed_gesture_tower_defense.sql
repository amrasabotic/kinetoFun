-- ============================================================================
-- KinetoFun — Gesture Tower Defense seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId:
-- 'gesture-tower-defense', score } (called automatically by GameIframe ->
-- GAME_COMPLETE, wired in games/gesture-tower-defense/src/App.tsx via
-- window.parent.postMessage) will insert a row into public.scores with no
-- further setup.
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
  'gesture-tower-defense',
  'Gesture Tower Defense',
  'Pinch a tower from the tray and drop it on the field — defend your base from every wave, gesture-only.',
  'Gesture Tower Defense is a first-in-catalog strategy/placement game: pinch (thumb and index finger together) to '
  'grab a tower tile from the tray, carry it over the battlefield, and release the pinch over an empty build slot to '
  'place it — the exact drag-and-drop metaphor real hands already understand, reusing the same pinch primitive proven '
  'by this platform''s farm-builder and zoo-architect games. Dragging an already-placed tower onto the "Sell" zone '
  'refunds part of its cost, and dragging it onto a different empty slot relocates it for free. Three tower types '
  '(a cheap fast-firing Blaster, an expensive splash-damage Cannon, and a Frost tower that slows enemies) let players '
  'build a real strategy against three enemy types (fast Runners, tanky Tanks, and standard Grunts) marching down a '
  'fixed path toward the base. Waves are procedurally generated — more enemies and a harsher mix of Runners/Tanks as '
  'the wave number climbs — and every wave is player-triggered via a hover-dwell "Start Wave" button, so there''s '
  'always time to rebuild between waves. Three modes: Campaign (15 levels cycling through 3 hand-authored maps with '
  'escalating wave counts, graded 1-3 stars on how much base health survived, unlocking one level at a time), '
  'Endless (an ever-climbing wave ladder with no ceiling, tracking the highest wave ever reached), and Daily '
  'Challenge (a fixed 8-wave gauntlet with enemy composition seeded by date, identical for every player that day). '
  'A short two-step calibration (find a hand, point at the target) runs once before the first play. Settings include '
  'gesture-driven sliders (a position-based drag control, not stepped buttons) for music/SFX volume and pinch '
  'sensitivity, plus a mirror-camera toggle and full lifetime statistics, all stored in localStorage. No mouse, '
  'touch, keyboard, or gamepad is used for gameplay at any point.',
  'A gesture-only tower-defense game: pinch a tower and drop it on the field to defend your base.',
  'Strategy',
  (select id from public.categories where slug = 'strategy' limit 1),
  'single',
  1,
  1,
  'from-slate-950 via-emerald-950 to-sky-950',
  '#38BDF8',
  4.6,
  2026,
  12,
  'medium',
  '8-14',
  'published',
  false
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

-- ----------------------------------------------------------------------------
-- Optional: verify the scores wiring after a few plays.
--
--   select s.score, s.achieved_at, u.name
--   from public.scores s
--   join public.users u on u.id = s.user_id
--   where s.game_id = 'gesture-tower-defense'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
