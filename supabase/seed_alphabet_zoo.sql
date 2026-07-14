-- ============================================================================
-- KinetoFun — Alphabet Zoo seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'alphabet-zoo',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/alphabet-zoo/src/App.tsx via window.parent.postMessage) will
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
  'alphabet-zoo',
  'Alphabet Zoo',
  'Point at the right letter to learn ABCs — perfect for toddlers.',
  'Alphabet Zoo is a toddler-friendly letter-recognition and early-phonics game, built on the same '
  'gentle gesture-only platform as Shape & Color Sorter. A single letter glyph or animal emoji bobs '
  'center-stage — hover a fingertip over the matching letter button (~600ms dwell) to sort it in, with '
  'a cheerful chime and optional spoken narration. Three simple modes teach different skills — Letter '
  'Match (bare letter glyphs for shape recognition), Animal Sounds (emoji + word to teach the letter-to-'
  'sound link, like "L is for Lion"), and Mixed (random pick of which presentation to use each round). '
  'Same no-penalty philosophy as Shape & Color Sorter: wrong letters just wobble + soft tone, no penalty, '
  'no fail state, every 10-round session still earns ≥1 star. Bin count ramps 2→3→4. Standalone settings '
  '(gesture-only volume sliders + toggles for colorblind icons, high contrast, larger cursor, slower pace, '
  'spoken narration). Shortened 2-step calibration. 7 achievements (First Round, Letter Master, Animal Master, '
  'Mixed Master, Perfect Round, Little Scholar [10 sessions], A to Z [seen all 26 letters across all sessions]). '
  'Reuses the battle-tested gesture stack from Flag Quest and Shape & Color Sorter — single shared MediaPipe '
  'HandLandmarker session driving both hover-to-select menus and 60fps in-game dwell, the proven dwell-progress '
  'pattern, the Web Audio synthesis idiom, and Zustand persist stores for local save. No per-game scores table '
  'needed — same generic `public.scores` wiring.',
  'Gesture-only ABC learning for little hands: point at letters to learn them by sight and sound — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-indigo-950 via-purple-900 to-fuchsia-950',
  '#F4C430',
  4.8,
  2026,
  5,
  'easy',
  '3-6',
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
--   where s.game_id = 'alphabet-zoo'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
