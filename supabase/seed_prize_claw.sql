-- ============================================================================
-- KinetoFun — Prize Claw catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'prize-claw',
  'Prize Claw',
  'Steer the claw with your hand, close your fist to grab, and win the toys.',
  'An arcade claw machine played by hand: move your open hand to steer the claw and close it into a fist to drop '
  'and grab. A claw right over the middle of a toy holds on best, heavy toys slip more easily, and every miss makes '
  'the claw a little stronger. Ten machines add stacked toy piles, a swinging claw, a golden crown to win and a '
  'conveyor belt, and every prize you win goes into your collection.',
  'Steer an arcade claw by hand and close your fist to win toys across 10 machines.',
  'Arcade',
  (select id from public.categories where slug = 'arcade' limit 1),
  'single', 1, 1,
  'from-blue-950 via-indigo-900 to-pink-700',
  '#FF4F8B',
  4.5, 2026, 8, 'easy', '5-12', 'published', false
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
