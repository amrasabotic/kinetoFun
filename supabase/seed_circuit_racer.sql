-- ============================================================================
-- KinetoFun — Circuit Racer seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'circuit-racer',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/circuit-racer/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
--
-- Like Pocket Pal (ADR-046), Circuit Racer has no discrete play "rounds":
-- it's progression-driven (linear unlock of 6 courses with star ratings)
-- and progressive difficulty (easy → hard AI opponents across courses).
-- The player submits their lifetime total coins earned as the score on exit
-- (monotonic, so it behaves like a normal high-score leaderboard despite
-- the ongoing nature of the game). Same generic `public.scores` table.
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
  'circuit-racer',
  'Circuit Racer',
  'Multi-lap racing with gesture controls and AI opponents.',
  'Circuit Racer is a gesture-controlled racing sim and the thirteenth game in the KinetoFun family — '
  'the first racing game and a direct successor to the persistent-sim infrastructure proven by both '
  'Little Farm Builder (ADR-045) and Pocket Pal (ADR-046). Unlike Farm Builder''s coin-grinding or '
  'Pocket Pal''s pet care, Circuit Racer delivers genuine gameplay progression: 6 hand-authored racing '
  'courses with escalating AI difficulty (easy → hard), linear unlock via top-3 finishes (matching '
  'the-sniper-code''s mission-progression pattern), and lap-based scoring. Player controls a car with '
  'gesture inputs (hand-X steers, raise hand accelerates, lower hand brakes, fist boost). Three AI '
  'opponents race simultaneously on every course; position at finish (1st/2nd/3rd/4th+) determines '
  'coins earned (3/2/1/0 respectively). Lap tracking detects crossings via finish-line hit zones; race '
  'ends when the first car completes all laps for that course (3–5 lap counts vary by difficulty). '
  'No fail state: player always scores based on final position, no DNF penalties. Vehicle physics fork '
  'Matter.js suspension from gesture-hill-adventure with steering added (hand-X applies angular velocity '
  'to chassis). Behind-the-car perspective rendering reuses trapezoid projection + camera system verbatim '
  'from gesture-mob-rally (depth-sort painter''s algorithm, 4 entities = player + 3 AI cars). Lap tracker '
  'is new (determines race completion, lap times, position ordering). AI racers use simple waypoint-following '
  'with speed modifiers per difficulty. Course progression matches sniper-code''s locked/unlocked unlock '
  'pattern: beat course N in top 3 to unlock course N+1 (linear chain, c1 → c6). Star rating: 1st = 3 '
  'stars, 2nd = 2 stars, 3rd = 1 star; stars persist and are re-earned if player beats prior best. '
  'Score submitted on exit is lifetime total coins earned (monotonic), so leaderboards show max coins '
  'across all races (same shape as farm-builder / pocket-pal, generic `public.scores` table). No new DB '
  'schema, no per-game races table. 6 achievements planned (First Race, Lap Master, Course King, '
  'Perfect Run, 100-Coin Champion, All Courses Unlocked). Reuses single shared MediaPipe HandLandmarker '
  'session, Web Audio synthesis for SFX, Zustand persist for progress (localStorage ''circuit-racer-progress''). '
  'Built Vite game served from `public/games/circuit-racer/`. Pending: full AI pathfinding refinement, real '
  'track geometry (procedural or hand-drawn), visual polish (environments, HUD graphics). Steering mechanics '
  '(0.08 rad/s at max, speed-sensitive) is untested in live camera environment.',
  'Fast-paced multi-lap racing with AI opponents and progressive difficulty — gesture-controlled high-speed action.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-blue-900 via-purple-900 to-indigo-900',
  '#00D4FF',
  4.7,
  2026,
  0,
  'medium',
  '5-9',
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

-- Leaderboard query (check lifetime coins earned per player, top 10):
--   select s.score, s.achieved_at, u.name
--   from public.scores s
--   join public.users u on u.id = s.user_id
--   where s.game_id = 'circuit-racer'
--   order by s.score desc
--   limit 10;
