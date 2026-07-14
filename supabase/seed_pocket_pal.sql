-- ============================================================================
-- KinetoFun — Pocket Pal seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'pocket-pal',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/pocket-pal/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
--
-- IMPORTANT DIFFERENCE FROM MOST GAMES: this is a Tamagotchi-style
-- companion sim, the second "persistent state" game after farm-builder
-- (ADR-045 to ADR-046 progression). The pet's full save state (hunger,
-- happiness, growth stage, hearts, unlocked items, achievements) lives
-- client-side only, in localStorage via zustand persist — same mechanism
-- every other game uses for progress/achievements, just a different data
-- shape (see ADR-046). Every time the player exits to the platform, the
-- game submits its current *lifetime total Hearts earned* as the score.
-- That number only ever grows, so it behaves like a normal high score under
-- the `game_leaderboards` view (max score per user/game) even though the
-- underlying game has no discrete "sessions" — it's a continuous, always-
-- persistent companion that grows, decays, and changes moods over time.
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
  'pocket-pal',
  'Pocket Pal',
  'Nurture your gesture-controlled digital companion — feed, play, pet.',
  'Pocket Pal is a gesture-only virtual pet companion game and the twelfth game in the '
  'KinetoFun family — the second persistent-state sim after Little Farm Builder (ADR-045), '
  'proving the lasting-world infrastructure is viable for multiple game genres. Unlike Farm '
  'Builder''s economy-and-expansion focus, Pocket Pal is purely relational: a single '
  'companion (fixed emoji-based creature, no species picker in v1) that the player feeds, '
  'plays with, and pets, watching it grow through five stages (Baby → Child → Teen → Adult '
  '→ Elder) based on lifetime care actions, and managing two stats — Hunger and Happiness — '
  'that decay over real wall-clock time but never fall below a floor of 40/100, so the pet '
  'never "dies" or enters a fail state even if totally neglected for days. Same no-punishment '
  'philosophy as every KinetoFun game: wrong actions wobble, not penalize; the pet just looks '
  'a little sad and perks back up instantly on re-engagement. Interactions split between '
  'pinch-drag (Feed and Play, reusing Farm Builder''s `usePinchDrag` hook verbatim) and '
  'hover-dwell (petting the pet sprite, unlocking new foods/toys). Nine unlockable care items '
  'split across three food types, three toy types, and three cosmetic accessories (hat, bandana, '
  'glasses — pure CSS overlay badges, no new asset pipeline). Every care action earns +1 Heart '
  '(uncapped, no cooldown — rewards grind-free play), and Hearts spend on unlocking items '
  '(one-time, dwell-based). Score submitted on exit is lifetime total Hearts earned (monotonic '
  'like Farm Builder''s coins), preserving the leaderboard shape despite having no discrete rounds. '
  '6 achievements: First Friend, Best Buddy (50 actions), All Grown Up (max stage), Full Closet '
  '(all unlocks), Heart of Gold (100 Hearts), Picture Perfect (both stats at 100 simultaneously). '
  'Stat decay driven by real elapsed time (persisted timestamp vs. Date.now(), same as Farm Builder''s '
  'crop growth math), so the companion keeps evolving between visits even when the game is closed. '
  'Reuses the proven gesture stack from all 11 prior games: single shared MediaPipe HandLandmarker '
  'session, Web Audio synthesis for feedback tones, Zustand persisted local save. No DB schema '
  'changes — same generic `public.scores` table, same localStorage-only client-side persistence pattern.',
  'A Tamagotchi-style companion that never dies, only moods shift — gesture-controlled growth, no fail state ever.',
  'Adventure',
  (select id from public.categories where slug = 'adventure' limit 1),
  'single',
  1,
  1,
  'from-pink-900 via-purple-900 to-indigo-900',
  '#FF1493',
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
--   where s.game_id = 'pocket-pal'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
