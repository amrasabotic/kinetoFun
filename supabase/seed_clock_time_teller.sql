-- ============================================================================
-- KinetoFun — Clock & Time Teller seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'clock-time-teller',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/clock-time-teller/src/App.tsx via window.parent.postMessage) will
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
  'clock-time-teller',
  'Clock & Time Teller',
  'Point at the right time to learn to read the clock — analog and digital, both directions.',
  'Clock & Time Teller is a gesture-only game that teaches kids to tell time, built on the same '
  'proven hover-select platform as Shape & Color Sorter and Alphabet Zoo. Each round shows a time '
  'one of two ways — an analog clock face or a digital readout — and the player hovers a fingertip '
  'over the matching answer among a few choices (~600ms dwell) to score. Two modes teach the skill '
  'from both directions: Read the Clock (see an analog face, pick the digital time) and Set the Clock '
  '(see a digital time, pick the matching analog face), plus a Mixed mode that quizzes both ways. '
  'Times are restricted to the quarter-hour increments kids are actually taught with (o''clock, quarter '
  'past, half past, quarter to), and early rounds only use the easier o''clock/half-past times before '
  'introducing quarter hours later in the session. Optional spoken narration says each time using real '
  'time-telling vocabulary ("quarter past three", not just digits). Same no-penalty philosophy as every '
  'other KinetoFun gesture game: wrong answers just wobble with a soft tone, no score deduction, no fail '
  'state, every session earns at least one star. 6 achievements (First Round, Clock Reader Master, Clock '
  'Setter Master, Mixed Master, Perfect Round, Time Traveler). Reuses the same proven gesture stack as '
  'the sibling games — single shared MediaPipe HandLandmarker session, hover-dwell selection, Web Audio '
  'synthesis + Web Speech narration, Zustand persisted local save. No per-game scores table needed — '
  'same generic `public.scores` wiring as every other game.',
  'Gesture-only clock-reading game: point at the matching time to learn analog and digital time-telling — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-indigo-950 via-purple-900 to-fuchsia-950',
  '#F4C430',
  4.7,
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
--   where s.game_id = 'clock-time-teller'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
