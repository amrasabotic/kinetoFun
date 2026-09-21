-- ============================================================================
-- KinetoFun — Migration 0004
-- SuperAdmin platform expansion: Categories, enhanced Games, Audit Logs.
-- ----------------------------------------------------------------------------
-- Runs AFTER schema.sql + 0001 + 0003. Idempotent (safe to re-run).
-- Supabase Dashboard → SQL Editor → paste → Run.
--
-- DESIGN NOTES (non-breaking by intent):
--  • `categories` is the new managed taxonomy. It is SEEDED from the existing
--    6 `game_category` enum values so nothing changes for current games.
--  • `games.category_id` is a NEW nullable FK to categories. The legacy
--    `games.category` enum column is KEPT and stays in sync — the public site
--    still filters on it, so existing read paths are untouched.
--  • `games.status` defaults to 'published' so every already-seeded game stays
--    visible to normal users. Draft/Archived are admin-only (filtered in the
--    public repository).
-- ============================================================================

-- ── enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type game_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

-- ── categories  (managed taxonomy) ───────────────────────────────────────────
create table if not exists public.categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null,
  description text        not null default '',
  icon        text        not null default 'Gamepad2',   -- lucide icon name
  image       text,                                       -- optional storage URL
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists categories_slug_key on public.categories (lower(slug));
create index if not exists categories_sort_idx on public.categories (sort_order);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Seed the managed table from the legacy enum values (once).
insert into public.categories (name, slug, description, icon, sort_order)
values
  ('Action',    'action',    'Fast-paced games that test reflexes.',        'Swords',     1),
  ('Puzzle',    'puzzle',    'Brain teasers and logic challenges.',         'Puzzle',     2),
  ('Sports',    'sports',    'Competitive sports and athletics.',           'Trophy',     3),
  ('Arcade',    'arcade',    'Classic pick-up-and-play arcade fun.',        'Joystick',   4),
  ('Adventure', 'adventure', 'Story-driven journeys and exploration.',      'Compass',    5),
  ('Party',     'party',     'Multiplayer games for groups.',               'PartyPopper', 6)
on conflict (lower(slug)) do nothing;

-- ── games extensions ─────────────────────────────────────────────────────────
alter table public.games
  add column if not exists category_id       uuid references public.categories (id) on delete set null,
  add column if not exists status            game_status not null default 'published',
  add column if not exists difficulty        game_difficulty not null default 'medium',
  add column if not exists age_group         text not null default '6-8',
  add column if not exists short_description text not null default '',
  add column if not exists thumbnail         text,
  add column if not exists play_count        integer not null default 0 check (play_count >= 0);

create index if not exists games_status_idx      on public.games (status);
create index if not exists games_category_id_idx on public.games (category_id);

-- Backfill category_id from the legacy enum (match on name).
update public.games g
set category_id = c.id
from public.categories c
where g.category_id is null
  and c.name = g.category::text;

-- Backfill play_count from existing session history so analytics aren't empty.
update public.games g
set play_count = sub.cnt
from (
  select game_id, count(*)::int as cnt
  from public.game_sessions
  group by game_id
) sub
where sub.game_id = g.id
  and g.play_count = 0;

-- ── audit_logs  (SuperAdmin action trail) ────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  admin_id    uuid        references public.users (id) on delete set null,
  admin_name  text        not null,
  action      text        not null,             -- e.g. 'category.created'
  entity_type text        not null,             -- 'category' | 'game' | 'user'
  entity_id   text,                             -- slug or uuid of the target
  details     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity_type);
create index if not exists audit_logs_admin_idx   on public.audit_logs (admin_id);

-- ── RLS (locked down; server uses the service role which bypasses RLS) ────────
alter table public.categories enable row level security;
alter table public.audit_logs enable row level security;
