-- ============================================================================
-- KinetoFun — Opposites Match seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'opposites-match',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/opposites-match/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores for the signed-in user with no further
-- setup — there is no per-game scores table, all games share the one table.
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
  'opposites-match',
  'Opposites Match',
  'Point at the opposite word or picture — big & small, hot & cold, fast & slow.',
  'Opposites Match is a gesture-only vocabulary-building game that teaches kids opposite word pairs, '
  'built on the same proven hover-select platform as Weather & Seasons Sorter and Coin & Money Counter. '
  'Each round shows one word from an opposite pair — as text or as a small icon — and the player hovers '
  'a fingertip over the matching opposite among a few choices (~600ms dwell) to score. Three modes vary '
  'the presentation: Words (text prompt, text answers), Pictures (icon prompt, icon answers), and Mixed '
  '(randomly varies presentation each round). Twelve opposite pairs (big/small, hot/cold, fast/slow, '
  'up/down, happy/sad, day/night, open/closed, full/empty, tall/short, wet/dry, loud/quiet, heavy/light), '
  'each with a simple hand-drawn icon per side. Since "opposite of" is a symmetric relation, which word '
  'of the pair is shown as the prompt is randomized every round, so kids practice both directions '
  '(big→small and small→big) across a session. Distractor answers are always drawn from other pairs '
  'entirely, so a wrong choice is never a near-miss synonym. Optional spoken narration asks the question '
  'and confirms the answer ("The opposite of Big is Small!"). Same no-penalty philosophy as every other '
  'KinetoFun gesture game: wrong answers just wobble with a soft tone, no score deduction, no fail state, '
  'every session earns at least one star. 6 achievements (First Round, Word Master, Picture Master, Mixed '
  'Master, Perfect Round, Opposite Genius). Reuses the same proven gesture stack as the sibling games — '
  'single shared MediaPipe HandLandmarker session, hover-dwell selection, Web Audio synthesis + Web Speech '
  'narration, Zustand persisted local save. No per-game scores table needed — same generic `public.scores` '
  'wiring as every other game.',
  'Gesture-only vocabulary game: point at the opposite word or picture — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-orange-950 via-amber-900 to-emerald-950',
  '#F07A26',
  4.7,
  2026,
  6,
  'easy',
  '3-7',
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
--   where s.game_id = 'opposites-match'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
