-- ============================================================================
-- KinetoFun — Musical Instrument Sounds seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'musical-instrument-sounds',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/musical-instrument-sounds/src/App.tsx via window.parent.postMessage)
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
  'musical-instrument-sounds',
  'Musical Instrument Sounds',
  'Listen to a sound, then point at the matching instrument — drums, guitar, piano, and more.',
  'Musical Instrument Sounds is a gesture-only sound-recognition game and the first KinetoFun game '
  'with an audio-first prompt: instead of showing something to look at, each round plays a short '
  'synthesized instrument sound (Web Audio, procedurally generated, no audio files) and the player '
  'hovers a fingertip over the matching instrument icon + name among a few choices (~600ms dwell) to '
  'score. A Replay button lets the child re-trigger the prompt sound as many times as needed. Ten '
  'instruments across two families — Percussion (drum, tambourine, xylophone, cymbal, maracas) and '
  'Melodic (piano, guitar, flute, violin, trumpet) — each with a distinct procedurally-synthesized '
  'timbre (noise bursts with different filtering for percussion; oscillator recipes with different '
  'waveforms, envelopes, and vibrato for melodic instruments) and a simple hand-drawn icon. Three '
  'modes: Percussion, Melodic, and Mixed (draws from all ten). Distractors are always drawn from the '
  'same family as the round''s mode (or the full set in Mixed), so every choice is a plausible, '
  'genuinely different instrument. Same no-penalty philosophy as every other KinetoFun gesture game: '
  'wrong answers just wobble with a soft tone, no score deduction, no fail state, every session earns '
  'at least one star. 6 achievements (First Round, Percussion Master, Melodic Master, Mixed Master, '
  'Perfect Round, Music Maestro). Reuses the same proven gesture stack as the sibling games — single '
  'shared MediaPipe HandLandmarker session, hover-dwell selection, Web Audio synthesis + Web Speech '
  'narration, Zustand persisted local save. No per-game scores table needed — same generic '
  '`public.scores` wiring as every other game.',
  'Gesture-only sound-matching game: listen to an instrument and point at the match — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-red-950 via-purple-900 to-blue-950',
  '#9B4FD6',
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
--   where s.game_id = 'musical-instrument-sounds'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
