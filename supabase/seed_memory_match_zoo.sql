-- ============================================================================
-- KinetoFun — Memory Match Zoo seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
--
-- Scores wiring: `public.scores` already has a generic `game_id text
-- references public.games (id)` foreign key (see supabase/schema.sql). Once
-- this game is inserted below, POST /api/scores { gameId: 'memory-match-zoo',
-- score } (already called automatically by GameIframe → GAME_COMPLETE, wired
-- in games/memory-match-zoo/src/App.tsx via window.parent.postMessage) will
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
  'memory-match-zoo',
  'Memory Match Zoo',
  'Flip cards to find matching animal pairs — a classic memory game played by pointing.',
  'Memory Match Zoo is a gesture-only card-flip concentration game, the fourth game in the '
  'small-and-simple KinetoFun family and the first built on a genuinely new mechanic rather than '
  'a re-skin of the point-and-sort pattern. A grid of face-down cards hides pairs of zoo animals — '
  'hover a fingertip over a card (~600ms dwell) to flip it, then flip a second card. Matching pairs '
  'lock face-up with a cheerful chime; a mismatch briefly reveals both cards so the player can '
  'remember them, then flips them back — no timer, no penalty, no fail state, same house philosophy '
  'as every other KinetoFun gesture game. Three board sizes double as difficulty levels: Small Zoo '
  '(3 pairs, 6 cards) for the youngest players, Medium Zoo (6 pairs, 12 cards), and Big Zoo (8 pairs, '
  '16 cards) for players who have outgrown the smaller boards. Scoring is based on flip efficiency '
  'against the theoretical-minimum flip count, graded generously so every cleared board earns at '
  'least one star. Optional spoken narration says each animal''s name aloud on flip. 6 local '
  'achievements (First Match, Small/Medium/Big Zoo Master, Perfect Memory, Memory Champion). Reuses '
  'the same proven gesture stack as Flag Quest, Shape & Color Sorter, and Alphabet Zoo — single '
  'shared MediaPipe HandLandmarker session, hover-dwell selection, Web Audio synthesis + Web Speech '
  'narration, Zustand persisted local save. No per-game scores table needed — same generic '
  '`public.scores` wiring as every other game.',
  'Gesture-only memory game: flip cards with your fingertip to find matching animal pairs — no fail state, ever.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single',
  1,
  1,
  'from-indigo-950 via-purple-900 to-fuchsia-950',
  '#2FA35A',
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
--   where s.game_id = 'memory-match-zoo'
--   order by s.score desc
--   limit 10;
-- ----------------------------------------------------------------------------
