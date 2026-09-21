-- ============================================================================
-- KinetoFun — Little Farm Builder seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'farm-builder',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/farm-builder/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
--
-- IMPORTANT DIFFERENCE FROM OTHER GAMES: this is a persistent sim, not a
-- scored round. Its full save state (plots, coins, unlocked crops, lifetime
-- stats) lives client-side only, in localStorage via zustand persist — same
-- mechanism every other game uses for progress/achievements, just a
-- different data shape (see ADR-045). Every time the player exits to the
-- platform, the game submits its current *lifetime total coins earned* as
-- the score. That number only ever grows, so it behaves like a normal high
-- score under the `game_leaderboards` view (max score per user/game) even
-- though the underlying game has no discrete "rounds."
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
  'farm-builder',
  'Little Farm Builder',
  'Plant seeds, watch them grow, and harvest your own gesture-controlled farm.',
  'Little Farm Builder is a gesture-only farming simulation and the eleventh game in the '
  'KinetoFun family — the first with a genuinely persistent save state (a farm that keeps '
  'growing between visits) and the first to use continuous pinch-and-drag as its core '
  'interaction instead of hover-and-dwell. Players pinch-grab a seed from the tray at the '
  'bottom of the screen, drag it over an empty plot, and release to plant it (costs coins); '
  'crops grow through three visual stages — seed, sprout, ripe — based on real elapsed time, '
  'so a planted crop keeps maturing even after the player closes the game and comes back '
  'later. Once ripe, the player pinch-grabs the crop directly out of its plot and drags it to '
  'the basket to harvest it for coins. Four crops with different pacing and value: Carrot '
  '(20s, cheap, always unlocked), Tomato (60s), Corn (3 min), and Pumpkin (8 min, most '
  'valuable) — new crop types and additional plots (starting at 4, expandable up to 12) are '
  'unlocked by spending coins via simple hover-dwell buttons, giving the farm a visible '
  'city-builder-style progression over repeated visits. Discrete actions (unlocking a crop '
  'type, buying a new plot, menu navigation) reuse the existing hover-dwell `HoverButton` '
  'pattern; only planting and harvesting use the new pinch-drag mechanic, built on a new '
  '`isPinching` hand-frame primitive (thumb-to-index-tip distance, debounced ~100ms against '
  'landmark jitter — the same fix already proven in gesture-love-balls'' pinch-to-draw '
  'mechanic) and a purpose-built `usePinchDrag` hook that hit-tests DOM rects at grab/release '
  'time, extending the same rect-based hit-testing idiom `HoverButton` already uses for hover '
  'detection. No fail state, no score penalty — coins only ever go up, plots only ever unlock, '
  'matching the no-punishment philosophy of every other KinetoFun gesture game. 6 achievements '
  '(First Harvest, Green Thumb, Full Table, Land Baron, Century Farmer, Master Grower). Reuses '
  'the same proven gesture stack as the sibling games — single shared MediaPipe HandLandmarker '
  'session, Web Audio synthesis, Zustand persisted local save (a farm-shaped save instead of a '
  'best-score-per-mode save, but the same persist-to-localStorage mechanism). No per-game '
  'scores table needed — same generic `public.scores` wiring as every other game, just fed a '
  'different number (lifetime coins instead of a round score).',
  'Gesture-only farming sim: pinch to plant and harvest, watch your farm grow between visits — no fail state, ever.',
  'Adventure',
  (select id from public.categories where slug = 'adventure' limit 1),
  'single',
  1,
  1,
  'from-green-950 via-emerald-900 to-lime-950',
  '#2FA35A',
  4.8,
  2026,
  8,
  'easy',
  '4-9',
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
--
--   select s.score, s.achieved_at, u.name
--   from public.scores s
--   join public.users u on u.id = s.user_id
--   where s.game_id = 'farm-builder'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
