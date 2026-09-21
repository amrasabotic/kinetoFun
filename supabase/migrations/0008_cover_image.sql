-- Add cover_image column to games table (separate from the gradient `cover`
-- and the smaller `thumbnail`). Used by the admin "Game image" upload field.
alter table public.games
  add column if not exists cover_image text;
