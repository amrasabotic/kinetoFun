-- Add soft-deactivate support to users.
-- active = false blocks login without destroying any data.
-- Existing rows default to true (all current users remain active).

alter table public.users
  add column if not exists active boolean not null default true;

-- Partial index: only indexes inactive users (small, fast for the DAL check).
create index if not exists users_active_idx
  on public.users (id)
  where active = false;
