-- ============================================================================
-- KinetoFun — Gesture Mini-Golf seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId:
-- 'gesture-mini-golf', score } (called automatically by GameIframe ->
-- GAME_COMPLETE, wired in games/gesture-mini-golf/src/App.tsx via
-- window.parent.postMessage) will insert a row into public.scores with no
-- further setup. Note: golf itself scores lowest-strokes-wins, so the
-- posted score is a converted "higher is better" value (see
-- systems/scoringEngine.ts's toLeaderboardScore), matching every other
-- game's leaderboard convention.
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
  'gesture-mini-golf',
  'Gesture Mini-Golf',
  'Point where you want to putt, wind up, and swing down through the release line to roll the ball across the green.',
  'Gesture Mini-Golf is a gesture-only putting game that reuses the same swing vocabulary as Gesture '
  'Bowling Lane — raise a hand to cross a backswing line, then swing it back down through a release '
  'line to let the ball go, with putt power read from how fast that downswing was. Where it diverges '
  'from bowling is what happens next: instead of one lane and a fixed pin-knockdown animation, the '
  'ball rolls in real time across a top-down green with actual per-tick physics — walls bounce it, '
  'sand traps slow it down hard, slopes constantly nudge it sideways, and water hazards sink it with a '
  'one-stroke penalty and a drop back to the tee. The putt''s direction comes from wherever the hand is '
  'pointing at the moment the backswing locks in, drawn as a dotted aim line from the ball to the '
  'target so the sideways compensation needed around walls and slopes is always visible before the '
  'swing. Six hand-built holes increase in obstacle complexity from a plain straight tap-in to a '
  'sand-and-water-and-corridor-walls combination hole, scored with a real stroke-play scoreboard '
  '(birdie/par/bogey labels, hole-in-one detection). Three difficulty tiers change how many of the six '
  'holes are played and how forgiving the cup and putt power are (Easy: 4 holes, wide cup, easy reach; '
  'Hard: all 6 holes, tight cup, unforgiving power). Four modes: Classic (a full untimed round), Timed '
  '(as many holes as fit in 4 minutes), Zen (no clock), and Daily (a subtle seeded "green speed" shared '
  'by everyone that day). A two-hands-raised gesture restarts the round at any point; every HUD/menu '
  'control is hover-dwell only, matching the platform-wide "no clicks" convention — the swing is the '
  'only motion-based gesture. Web Audio synthesis covers the windup whoosh, putt strike, splash, sand '
  'thud, holed chime, and a round-complete fanfare; best scores per mode+difficulty, lifetime '
  'holes-in-one, and daily completion persist to localStorage.',
  'A gesture-only mini-golf game: point to aim, wind up, and swing down to putt across six obstacle-filled holes.',
  'Sports',
  (select id from public.categories where slug = 'sports' limit 1),
  'single',
  1,
  1,
  'from-emerald-950 via-slate-900 to-green-950',
  '#4ADE80',
  4.7,
  2026,
  9,
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
--   where s.game_id = 'gesture-mini-golf'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
