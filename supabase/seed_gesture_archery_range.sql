-- ============================================================================
-- KinetoFun — Gesture Archery Range seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId:
-- 'gesture-archery-range', score } (called automatically by GameIframe ->
-- GAME_COMPLETE, wired in games/gesture-archery-range/src/App.tsx via
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
  'gesture-archery-range',
  'Gesture Archery Range',
  'Aim with your finger, draw a fist, and open your hand to loose the arrow — no mouse, no trigger.',
  'Gesture Archery Range is a gesture-only target-archery game built around a three-step hand flow that '
  'mirrors drawing a real bow: the index finger alone moves the aiming reticle over the target at all '
  'times; closing a fist begins drawing the bowstring, charging a power meter the longer it is held; '
  'opening the hand releases the arrow at whatever power was reached. Relaxing the fist without ever '
  'opening the palm is treated as lowering the bow — the draw is abandoned with no arrow spent, just '
  'like letting down a real bow. The shot resolution is skill-based on two axes at once: the reticle '
  'position is where the arrow lands with exactly the right amount of power and no wind, but '
  'under-drawing makes the shot drop low and over-drawing sends it sailing high, so distance judgment '
  'matters as much as aim; medium/hard rounds add lateral wind drift that must be aimed off-center to '
  'compensate for, the same way real archers correct for crosswind. Three difficulty tiers change '
  'target distance, ring size, and wind strength (Easy: close range, no wind; Medium: mid-range, light '
  'wind; Hard: long range, strong gusts and tight rings). Four modes: Classic (a fixed quiver of 8 '
  'arrows, no clock), Timed (90 seconds to loose as many arrows as possible), Zen (unhurried practice, '
  'no timer), and Daily (a seeded distance/wind combo shared by everyone each day). A two-hands-raised '
  'gesture restarts the round instantly. Every HUD control (Pause/Restart/Exit) and every menu button '
  'is a hover-dwell control, matching the platform-wide "no clicks" convention — the only gestures that '
  'ever touch gameplay itself are the index-finger aim, the fist draw, and the open-palm release. Web '
  'Audio synthesis handles the string creak, release twang, thud, bullseye chime, miss, and victory '
  'cues; round results (best score per mode+difficulty, lifetime bullseyes, daily completion) persist '
  'to localStorage.',
  'A gesture-only archery range: point to aim, fist to draw, open your hand to release the arrow.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-lime-950 via-slate-900 to-emerald-950',
  '#A3E635',
  4.7,
  2026,
  7,
  'medium',
  '6-12',
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
--   where s.game_id = 'gesture-archery-range'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
