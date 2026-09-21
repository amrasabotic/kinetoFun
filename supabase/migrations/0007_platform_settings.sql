-- Migration 0007: platform_settings
-- Single-row settings table for superadmin-managed platform configuration.
-- The CHECK (id = 1) constraint enforces exactly one row.

create table if not exists public.platform_settings (
  id                       integer     primary key default 1 check (id = 1),

  -- Maintenance
  maintenance_mode         boolean     not null default false,
  maintenance_message      text        not null default 'We''re performing scheduled maintenance. We''ll be back shortly.',

  -- Announcement banner
  announcement_active      boolean     not null default false,
  announcement_text        text        not null default '',
  announcement_type        text        not null default 'info'
                             check (announcement_type in ('info', 'warning', 'success')),

  -- Registration
  registration_open        boolean     not null default true,

  -- Content
  featured_section_title   text        not null default 'Featured Games',
  max_leaderboard_entries  integer     not null default 10 check (max_leaderboard_entries > 0 and max_leaderboard_entries <= 100),
  default_difficulty_filter text       not null default 'all'
                             check (default_difficulty_filter in ('all', 'easy', 'medium', 'hard')),

  updated_at               timestamptz not null default now(),
  updated_by               uuid        references public.users (id) on delete set null
);

-- Seed the single row so queries never return null
insert into public.platform_settings (id) values (1) on conflict do nothing;

alter table public.platform_settings enable row level security;
