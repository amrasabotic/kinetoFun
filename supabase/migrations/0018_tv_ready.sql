-- Migration 0018: games a superadmin has marked as playable on the TV (hand-only, exit by hand).
-- Idempotent. Run with: node scripts/run-migration.mjs supabase/migrations/0018_tv_ready.sql

alter table public.games
  add column if not exists tv_ready boolean not null default false;
