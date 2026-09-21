-- ============================================================================
-- KinetoFun — Gesture Piano game seed
-- Run in the Supabase Dashboard → SQL Editor.
-- Safe to re-run (upsert on id).
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
  'gesture-piano',
  'Gesture Piano',
  'Play piano with your fingertips — no keys required.',
  'A Guitar Hero–style music game mapped to a 10-key virtual piano (C4–E5). '
  'Hover your fingertips over the colored key zones to play notes. '
  'In Rhythm mode, colored bars fall from the top of the screen — catch each bar '
  'with the matching finger when it reaches the hit line to score. '
  'Three built-in songs span all skill levels: '
  'Easy (Twinkle Twinkle, 80 BPM), Medium (Ode to Joy, 100 BPM), and '
  'Hard (Für Elise–inspired, 120 BPM with rapid runs). '
  'Free Play lets you explore the piano freely without any timing pressure. '
  'Perfect for practicing finger coordination and extending the music genre beyond just drums.',
  'Guitar Hero–style piano: catch falling bars with your fingertips to play real piano notes.',
  'Arcade',
  (select id from public.categories where slug = 'arcade' limit 1),
  'single',
  1,
  1,
  'from-purple-600 via-violet-600 to-indigo-700',
  '#8b5cf6',
  4.5,
  2026,
  10,
  'medium',
  '8+',
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
