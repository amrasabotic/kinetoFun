-- ============================================================================
-- KinetoFun — Gesture Sudoku seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'gesture-sudoku',
-- score } (called automatically by GameIframe -> GAME_COMPLETE, wired in
-- games/gesture-sudoku/src/App.tsx via window.parent.postMessage) will
-- insert a row into public.scores with no further setup.
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
  'gesture-sudoku',
  'Gesture Sudoku',
  'Hover a cell and pinch to select it, then hover a number to fill it in — a classic number puzzle, gesture-only.',
  'Gesture Sudoku brings the platform''s first number-logic puzzle, built entirely from gesture '
  'primitives already proven in this catalog rather than any new gesture-detection code: hovering a '
  'cell and pinching down selects it (the same hover-then-pinch tap used by Word Search''s grid), and '
  'hovering one of the nine number buttons (or Erase) for a moment fills the selected cell (the same '
  'hover-dwell used by every menu and HUD control on the platform). A held pinch never needs to drag '
  'anywhere — Sudoku has no path to trace, just a tap to select and a dwell to fill — which keeps the '
  'interaction unusually simple to both build and play. Puzzles are generated fresh each round with a '
  'randomized backtracking solver (a real, valid 9x9 solution every time) and then reduced to a '
  'difficulty-appropriate number of starting clues (Easy 40, Medium 32, Hard 26). Conflicting entries '
  '(a repeated digit in a row, column, or 3x3 box) highlight immediately but never penalize — matching '
  'the platform''s established no-punishment philosophy — and a single-cell Hint reveals just the '
  'correct digit for whichever cell is selected, never the rest of the board. Four modes: Classic (an '
  'untimed single puzzle), Timed (a 5-minute countdown), Zen (fully relaxed, no clock), and Daily (a '
  'seeded puzzle shared by everyone that day, generated identically for every player via the same '
  'seeded-random convention as the platform''s other Daily modes). A two-hands-raised gesture restarts '
  'the puzzle at any point. Web Audio synthesis covers cell selection, digit entry, erase, a conflict '
  'buzz, and a victory fanfare; puzzles completed, best scores per mode+difficulty, and daily '
  'completion persist to localStorage.',
  'A gesture-only Sudoku: hover and pinch to pick a cell, hover a number to fill it in.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-sky-950 via-slate-900 to-blue-950',
  '#38BDF8',
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
--   where s.game_id = 'gesture-sudoku'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
