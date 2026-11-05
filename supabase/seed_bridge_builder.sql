-- ============================================================================
-- KinetoFun — Bridge Builder catalog row
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run (upsert on id).
-- ============================================================================

insert into public.games (
  id, title, tagline, description, short_description, category, category_id,
  players, min_players, max_players, cover, accent, rating, release_year,
  duration_minutes, difficulty, age_group, status, featured
)
values (
  'bridge-builder',
  'Bridge Builder',
  'Build a bridge from beams and watch a truck try to cross it.',
  'A truck needs to cross a gap between two cliffs. Pinch your thumb and finger on a joint, move and let go to lay '
  'a beam: road beams carry the truck, wood and steel hold the road up. Triangles keep their shape, so build them. '
  'Press GO and the truck drives across while every beam glows green, orange or red with the load it carries; '
  'too much and it snaps. Stay under the budget and spend less for more stars. Thirty crossings bring rocks to '
  'build on, rivers with boats below, steel, and heavier vans, trucks and buses.',
  'Engineer bridges from beams across 30 crossings and test them with a truck.',
  'Puzzle',
  (select id from public.categories where slug = 'puzzle' limit 1),
  'single', 1, 1,
  'from-blue-900 via-sky-700 to-amber-300',
  '#1D4F8C',
  4.6, 2026, 10, 'medium', '7-14', 'published', false
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
