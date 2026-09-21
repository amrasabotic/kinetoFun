-- ============================================================================
-- KinetoFun — Liquid Puzzle seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'liquid-puzzle',
-- score } (called automatically by GameIframe -> GAME_COMPLETE, wired in
-- games/liquid-puzzle/src/components/GameScreen.tsx via
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
  'liquid-puzzle',
  'Liquid Puzzle',
  'Pinch to grab a glass tube, drag it over another to pour — sort every color into its own tube.',
  'Liquid Puzzle is a gesture-only water-sorting puzzle: your palm moves the cursor, a pinch (thumb and index finger '
  'together) grabs whichever tube it''s hovering, and dragging that pinch over a different tube pours into it, just '
  'like tipping a bottle — releasing the pinch drops the tube. A pour only succeeds if the destination tube is empty '
  'or its top color matches — otherwise the move is rejected with a shake '
  'and a soft error tone, never silently ignored. Every level is dealt at random and verified solvable by a real '
  'solver before it is ever shown to the player, so no puzzle is ever impossible, no matter how scrambled it looks. '
  'Three modes: Levels (hundreds of procedurally generated puzzles, growing from 3 colors/4 tubes up through a dozen '
  'colors and far more tubes, unlocking one at a time and graded 1-3 stars on moves, hints, and speed), Endless '
  '(an ever-escalating ladder with no ceiling, tracking the highest level ever reached), and Daily Challenge (one '
  'board shared by everyone each day, seeded by date). A thumbs-up gesture undoes the last pour instantly — with a '
  'full, unlimited undo history — and a victory sign (peace sign) reveals the single next recommended move without '
  'ever spoiling the full solution. Holding an open palm continuously for two seconds anywhere on screen opens the '
  'pause menu, keeping every meaningful in-game action (grab/pour, undo, hint, pause) on its own distinct, '
  'deliberately-recognized gesture so nothing fires by accident. A short calibration flow (find a hand, hold an open palm, '
  'sweep left/right/up/down) runs once at startup before the main menu appears. Every tube is rendered as glass with '
  'a pouring arc-and-splash animation, a tilt as a grabbed tube is lifted, glow highlights on the grabbed and hinted '
  'tubes, and a full settings panel '
  '(gesture sensitivity, cursor speed, animation quality, music/SFX volume, colorblind symbol overlays, and a '
  'left-handed HUD layout) alongside lifetime statistics, all stored in localStorage — no mouse, touch, keyboard, or '
  'gamepad is used for gameplay at any point.',
  'A gesture-only water-sorting puzzle: pinch to grab a tube, drag it over another to pour.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-sky-950 via-indigo-950 to-fuchsia-950',
  '#38BDF8',
  4.8,
  2026,
  10,
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
--   where s.game_id = 'liquid-puzzle'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
