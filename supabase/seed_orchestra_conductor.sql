-- ============================================================================
-- KinetoFun — Orchestra Conductor catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'orchestra-conductor',
  'Orchestra Conductor',
  'Wave your hand to conduct an animal orchestra at your own speed.',
  'The animal orchestra plays at the speed you conduct: every downward wave of your hand is one beat, big waves play '
  'loud and small waves play soft, and waving over a sleepy section brings it in when it lights up. Ten pieces, from '
  'Twinkle Twinkle to Jingle Bells, ask for slow, medium or fast tempos, loud and soft passages and well-timed cues. '
  'All music is played live by the game; nobody fails, and the stars reward a steady beat.',
  'Conduct an animal orchestra by waving your hand: set the tempo, play loud or soft, bring in each section.',
  'Arcade',
  (select id from public.categories where slug = 'arcade' limit 1),
  'single', 1, 1,
  'from-rose-950 via-red-900 to-amber-700',
  '#E0763A',
  4.5, 2026, 8, 'easy', '4-12', 'published', false
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
