-- Migration 0012: Per-user display settings
-- ============================================================================
-- Persists the Settings page's "Large UI text" / "Reduce motion" toggles
-- server-side so they follow the user across devices/browsers instead of
-- staying local to one browser's localStorage.
-- ============================================================================

alter table public.users
  add column if not exists large_text boolean not null default false,
  add column if not exists reduce_motion boolean not null default false;
