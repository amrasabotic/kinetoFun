-- ============================================================================
-- KinetoFun — Fruit & Vegetable Sorter seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'fruit-vegetable-sorter',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/fruit-vegetable-sorter/src/App.tsx via window.parent.postMessage)
-- will insert a row into public.scores for the signed-in user with no
-- further setup — there is no per-game scores table, all games share the
-- one table.
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
  'fruit-vegetable-sorter',
  'Fruit & Vegetable Sorter',
  'Look at fresh produce and sort it into the right category — fruits or vegetables!',
  'Fruit & Vegetable Sorter is a gesture-only categorization game and the tenth game in the '
  'KinetoFun family, teaching early nutrition and food literacy by sorting produce into two '
  'main categories: Fruits and Vegetables. Each round shows a colorful emoji picture of a '
  'produce item (apple, banana, strawberry, watermelon, orange, grape, carrot, broccoli, '
  'lettuce, tomato, bell pepper, corn); the player hovers a fingertip over the "Fruit" or '
  '"Vegetable" bin (~600ms dwell) to categorize it correctly. A simple two-choice format '
  'makes this game accessible and confidence-building from the start. Three modes split by '
  'content family (same grouping shape as Alphabet Zoo, Weather Sorter, and Opposites Match): '
  '**Fruits** mode focuses on learning common fruits; **Vegetables** mode focuses on learning '
  'common vegetables; **Mixed** mode blends both and tests real categorization skill. Distractors '
  'are never needed — each round is simply a binary choice (Fruit or Vegetable?). Ten rounds per '
  'session, always the same two bins. Same no-penalty philosophy as every other KinetoFun game: '
  'wrong answers wobble gently with a soft tone, no score deduction, no fail state, every session '
  'earns at least one star. 6 achievements (First Round, Fruit Expert, Veggie Expert, Mixed Master, '
  'Perfect Round, Food Champion). Reuses the same proven gesture stack as the sibling games — single '
  'shared MediaPipe HandLandmarker session, hover-dwell selection, Web Audio synthesis, Zustand '
  'persisted local save. No per-game scores table needed — same generic `public.scores` wiring as '
  'every other game.',
  'Gesture-only produce categorization: sort fruits from vegetables using just hover-dwell — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-green-950 via-emerald-900 to-lime-950',
  '#2FA35A',
  4.8,
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
--   where s.game_id = 'fruit-vegetable-sorter'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
