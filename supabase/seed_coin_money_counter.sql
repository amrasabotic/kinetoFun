-- ============================================================================
-- KinetoFun — Coin & Money Counter seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'coin-money-counter',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/coin-money-counter/src/App.tsx via window.parent.postMessage) will
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
  'coin-money-counter',
  'Coin & Money Counter',
  'Point at the coins or amount to learn money recognition and counting — no fail state, ever.',
  'Coin & Money Counter is a gesture-only game that teaches kids to count money and recognize coin '
  'values, built on the same proven hover-select platform as Clock & Time Teller and Alphabet Zoo. '
  'Each round shows an amount one of two ways — a group of coin icons or a digital total — and the '
  'player hovers a fingertip over the matching answer among a few choices (~600ms dwell) to score. '
  'Two modes teach the skill from both directions: Count the Coins (see coins, pick the digital amount) '
  'and Make the Amount (see a digital price, pick the matching coin group), plus a Mixed mode that '
  'quizzes both ways. Coin denominations are limited to the standard US coins kids actually use: '
  'penny (1¢), nickel (5¢), dime (10¢), quarter (25¢). Amounts stay under $1 (1¢–99¢), the standard '
  '"counting coins" range for young kids, with early rounds restricting to amounts that require just '
  '1–2 coins (easier) before later rounds allow up to 4 coins (harder), mirroring the same gentle '
  'difficulty ramp as the sibling games. Each amount is always broken down greedily (as many quarters '
  'as possible, then dimes, nickels, pennies) to keep the visual small and deterministic. Optional '
  'spoken narration says each amount in words ("twenty-seven cents", not raw digits), using age-appropriate '
  'vocabulary. Same no-penalty philosophy as every other KinetoFun gesture game: wrong answers just wobble '
  'with a soft tone, no score deduction, no fail state, every session earns at least one star. 6 achievements '
  '(First Round, Coin Counter Master, Money Maker Master, Mixed Master, Perfect Round, Money Wizard). '
  'Reuses the same proven gesture stack as the sibling games — single shared MediaPipe HandLandmarker '
  'session, hover-dwell selection, Web Audio synthesis + Web Speech narration, Zustand persisted local save. '
  'No per-game scores table needed — same generic `public.scores` wiring as every other game.',
  'Gesture-only money-counting game: point at coins or amounts to learn money recognition — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-amber-950 via-yellow-900 to-yellow-800',
  '#FFD700',
  4.8,
  2026,
  6,
  'easy',
  '5-8',
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
--   where s.game_id = 'coin-money-counter'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
