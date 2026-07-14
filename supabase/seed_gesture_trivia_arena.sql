-- ============================================================================
-- KinetoFun — Gesture Trivia Arena seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId:
-- 'gesture-trivia-arena', score } (called automatically by GameIframe ->
-- GAME_COMPLETE, wired in games/gesture-trivia-arena/src/App.tsx via
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
  'gesture-trivia-arena',
  'Gesture Trivia Arena',
  'Point at an answer and hold to select it — out-score the CPU over 9 rounds of open-domain trivia.',
  'Gesture Trivia Arena is a gesture-only multiple-choice quiz duel against a CPU rival: point at one of four answer '
  'tiles and hold still to select it — no new gesture vocabulary needed beyond the hover-dwell every menu on this '
  'platform already uses, since a quiz never needs a fist, pinch, or pose change. Nine questions per match are drawn '
  'from a 90-question hand-authored bank spanning six categories (Science, History, Geography, Pop Culture, Sports, '
  'and General Knowledge) across three difficulty tiers. The CPU opponent answers every round too, with its accuracy '
  'and thinking time scaled purely by the chosen difficulty (Easy/Medium/Hard) — never the rules, matching this '
  'catalog''s established AI-opponent convention. Correct answers score points with a speed bonus for faster '
  'responses, and whoever has the higher total after 9 rounds wins. Two modes: Classic (untimed, though answering '
  'faster still earns more points) and Blitz (an 8-second visible countdown per question — running out of time '
  'counts as a wrong answer). A Daily Challenge toggle seeds both the question selection and the CPU''s performance '
  'identically for every player on a given day, so daily scores are directly comparable. Full lifetime statistics '
  '(matches played, win rate, questions answered/correct, per-category accuracy, best score per mode/difficulty) are '
  'tracked in localStorage. No mouse, touch, keyboard, or gamepad is used for gameplay at any point.',
  'A gesture-only trivia quiz duel: point at an answer and hold to select it, out-score the CPU over 9 rounds.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-indigo-950 via-violet-950 to-fuchsia-950',
  '#818CF8',
  4.5,
  2026,
  8,
  'easy',
  '6-14',
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
--   where s.game_id = 'gesture-trivia-arena'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
