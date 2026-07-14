-- ============================================================================
-- KinetoFun — Flag Quest: World Colors seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'flag-quest', score }
-- (already called automatically by GameIframe → GAME_COMPLETE, wired in
-- games/flag-quest/src/App.tsx via window.parent.postMessage) will insert a
-- row into public.scores for the signed-in user with no further setup —
-- there is no per-game scores table, all games share the one table.
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
  'flag-quest',
  'Flag Quest: World Colors',
  'Paint the world''s flags using nothing but your hand — no mouse, no keyboard, no touch.',
  'Flag Quest: World Colors is a fully gesture-controlled painting quest across a hand-built atlas of '
  'national flags. Every level shows an outlined flag with its colored regions missing — hover your '
  'fingertip over a paint swatch for half a second to select a color, then hold your finger inside the '
  'matching region to fill it in with a satisfying gradual wash of color, sparkles, and a soft chime. '
  'Pick the wrong region and it flashes red and fades instead of punishing you harshly. Chain correct '
  'fills without a mistake to build combo multipliers up to x10, race a per-flag target time for bronze '
  'through perfect medals, and earn up to three stars per country. World Tour unlocks continents and '
  'countries progressively as you collect stars, Practice mode offers unlimited time with hints on any '
  'unlocked flag, and Endless mode serves up a randomized, gradually harder stream of flags for a '
  'leaderboard run. A built-in Gallery tracks capitals, population, language, independence year and a fun '
  'fact for every flag you unlock. Every menu — Play, Practice, World Tour, Endless, Gallery, Settings — '
  'is operated purely by hovering a fingertip over a glowing button for about 700ms, including fully '
  'gesture-driven sliders for music/SFX volume and toggles for colorblind mode, high contrast, a larger '
  'cursor, slower painting and camera mirroring. An open palm pauses the game and a fist resumes it, '
  'matching the pause gesture used across KinetoFun. Built for a single hand, with live confidence '
  'feedback, automatic "Hand Lost" pausing, and a guided five-step calibration flow before your first game.',
  'Gesture-only flag painting: hover to pick a color, hold your finger in the outline to fill it in, race the clock for stars.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-slate-950 via-indigo-900 to-fuchsia-950',
  '#8C5CFF',
  4.8,
  2026,
  12,
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

-- ----------------------------------------------------------------------------
-- Optional: verify the scores wiring after a few plays.
-- Top 10 Flag Quest scores:
--
--   select s.score, s.achieved_at, u.name
--   from public.scores s
--   join public.users u on u.id = s.user_id
--   where s.game_id = 'flag-quest'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
