-- ============================================================================
-- KinetoFun — Zoo & Aquarium Architect seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'zoo-architect',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/zoo-architect/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
--
-- Same persistent-sim pattern as farm-builder/pocket-pal/circuit-racer: the
-- player submits lifetime total Tickets earned (monotonic) as the score on
-- exit, preserving the platform's "max score per user" leaderboard shape
-- despite the underlying game having no discrete rounds.
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
  'zoo-architect',
  'Zoo & Aquarium Architect',
  'Design habitats, unlock animals, and welcome visitors to your gesture-built zoo.',
  'Zoo & Aquarium Architect is a gesture-only creative-building sim and the fourteenth game in the '
  'KinetoFun family — the third to reuse the persistent-sim + pinch-drag architecture proven by Little '
  'Farm Builder (ADR-045) and Pocket Pal (ADR-046), applied to a new domain: designing zoo habitats '
  'rather than managing a farm economy or caring for a single pet. Unlike those two games, placement '
  'here is free-form rather than grid-based or single-target — the player pinch-grabs an animal or '
  'decoration from the shop tray and drops it anywhere within the active habitat, at any position, '
  'building up a custom-designed enclosure over time. Four zones act as the game''s natural level '
  'structure, unlocked in order with Tickets: Savanna (the starter zone, unlocked from the start), '
  'Arctic, Ocean/Aquarium, and Rainforest — each with its own set of unlockable animal species and '
  'decorations (lions, elephants, giraffes and zebras in the savanna; polar bears, penguins, seals and '
  'arctic foxes up north; dolphins, whales, sea turtles, clownfish and octopi in the aquarium; tigers, '
  'gorillas, parrots, monkeys and sloths in the rainforest canopy). Every placed item contributes an '
  '"appeal value" to its zone and to the zoo''s overall appeal score; visitors generate Tickets '
  'passively over real wall-clock time based on total appeal — the same timestamp-based accrual '
  'pattern proven twice already (persisted lastCollectedAt vs. Date.now(), recomputed on load so '
  'Tickets keep accruing even while the game is closed), except uncapped rather than [0,1]-bounded, '
  'matching the family''s "currency only ever goes up" rule. A "Collect Tickets" dwell button banks '
  'the accrued amount into a spendable balance, mirroring Farm Builder''s harvest action. No fail '
  'state whatsoever: nothing decays, nothing can be placed "wrong," and appeal only ever increases as '
  'the player builds. Same gesture stack as every other game — single shared MediaPipe HandLandmarker '
  'session, hover-dwell for zone-switching/menu navigation/unlocks, pinch-drag (reused verbatim from '
  'the proven `usePinchDrag` hook) for the one core creative-placement verb. 6 achievements: First '
  'Habitat (first placement), Zoologist (10 items unlocked), Zone Master (fully unlock one zone''s '
  'roster), World Traveler (all 4 zones unlocked), Ticket Tycoon (1000 lifetime Tickets), Master '
  'Architect (50 total placements). Score submitted on exit is lifetime total Tickets earned '
  '(monotonic), same `public.scores` table every other game uses — no per-game schema, no DB changes.',
  'A creative zoo-building sim — pinch-drag animals and decor anywhere you like, no fail state, ever.',
  'Adventure',
  (select id from public.categories where slug = 'adventure' limit 1),
  'single',
  1,
  1,
  'from-emerald-950 via-teal-950 to-slate-900',
  '#4AD9A4',
  4.8,
  2026,
  0,
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
--   where s.game_id = 'zoo-architect'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
