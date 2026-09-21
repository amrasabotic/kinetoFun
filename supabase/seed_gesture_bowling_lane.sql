-- ============================================================================
-- KinetoFun — Gesture Bowling Lane seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId:
-- 'gesture-bowling-lane', score } (called automatically by GameIframe ->
-- GAME_COMPLETE, wired in games/gesture-bowling-lane/src/App.tsx via
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
  'gesture-bowling-lane',
  'Gesture Bowling Lane',
  'Aim with your hand, wind up, and swing down through the release line to bowl a full 10-frame game.',
  'Gesture Bowling Lane is a gesture-only ten-pin bowling game built around a swing-through motion '
  'instead of a click or a hover-dwell trigger. The hand''s live position sets where the ball starts on '
  'the lane; raising the hand upward crosses a "backswing" line and locks that starting position in, '
  'exactly like a bowler settling their approach; swinging the hand back down through a lower "release '
  'line" lets the ball go. Two things are captured at that release instant and nowhere else: how fast '
  'the downswing was (power — a quick swing rolls harder and carries further into the pin deck) and how '
  'far the hand drifted sideways during the forward swing (curve — a hook to one side, just like '
  'imparting spin with a real release). A full official ten-frame scoreboard runs underneath: strikes '
  'and spares earn the standard bonus-roll scoring, and the tenth frame correctly grants a fresh rack '
  'for bonus balls after a strike or spare, matching real bowling rules exactly (verified against known '
  'scoring scenarios including a 300 perfect game). Three difficulty tiers change how forgiving the pin '
  'knockdown radius is and how sensitive the ball is to sideways curve (Easy: wide hit radius, gentle '
  'curve; Hard: tight pocket, twitchy curve, easy to leave a split). Four modes: Classic (a full '
  'untimed 10-frame game), Timed (as many frames as fit in 5 minutes), Zen (relaxed, no clock), and '
  'Daily (a subtle seeded lane-oil drift shared by everyone that day, on top of the usual physics). A '
  'two-hands-raised gesture restarts the game at any point; every HUD/menu control is hover-dwell only, '
  'matching the platform-wide "no clicks" convention — the swing itself is the only motion-based '
  'gesture in the game. Web Audio synthesis covers the windup whoosh, release twang, pin crash, gutter '
  'thud, strike/spare chimes, and a game-over fanfare; best scores per mode+difficulty, lifetime '
  'strikes, and daily completion persist to localStorage.',
  'A gesture-only ten-pin bowling game: aim with your hand, wind up, and swing down to release the ball.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-amber-950 via-slate-900 to-orange-950',
  '#FCD34D',
  4.7,
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
--   where s.game_id = 'gesture-bowling-lane'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
