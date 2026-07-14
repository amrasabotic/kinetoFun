-- ============================================================================
-- KinetoFun — Weather & Seasons Sorter seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'weather-seasons-sorter',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/weather-seasons-sorter/src/App.tsx via window.parent.postMessage) will
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
  'weather-seasons-sorter',
  'Weather & Seasons Sorter',
  'Point at the right outfit for the weather — sun, snow, rain, and wind, both directions.',
  'Weather & Seasons Sorter is a gesture-only game that teaches kids weather and season reasoning, '
  'built on the same proven hover-select platform as Clock & Time Teller and Coin & Money Counter. '
  'Each round shows a weather/season scenario one of two ways — a weather-scene icon or a matching '
  'clothing/activity icon — and the player hovers a fingertip over the matching answer among a few '
  'choices (~600ms dwell) to score. Two modes teach the reasoning from both directions: What to Wear '
  '(see the weather, pick the right clothing) and Match the Weather (see the clothing, pick the right '
  'weather), plus a Mixed mode that quizzes both ways. Eight weather/season scenarios (sunny summer, '
  'snowy winter, rainy spring, windy fall, hot desert day, foggy morning, stormy day, cloudy afternoon), '
  'each with one canonical correct clothing/activity answer, so wrong choices are always plausible-'
  'looking but genuinely different items rather than near-duplicates. Optional spoken narration says '
  'each scenario with a short description ("Sunny Summer — wear your sunhat!"). Same no-penalty '
  'philosophy as every other KinetoFun gesture game: wrong answers just wobble with a soft tone, no '
  'score deduction, no fail state, every session earns at least one star. 6 achievements (First Round, '
  'Weather Watcher Master, Clothing Expert Master, Mixed Master, Perfect Round, Season Sage). Reuses '
  'the same proven gesture stack as the sibling games — single shared MediaPipe HandLandmarker session, '
  'hover-dwell selection, Web Audio synthesis + Web Speech narration, Zustand persisted local save. '
  'No per-game scores table needed — same generic `public.scores` wiring as every other game.',
  'Gesture-only weather-matching game: point at the right outfit for the weather — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-sky-950 via-blue-900 to-indigo-950',
  '#4A90D9',
  4.7,
  2026,
  6,
  'easy',
  '4-8',
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
--   where s.game_id = 'weather-seasons-sorter'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
