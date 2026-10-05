-- ============================================================================
-- 0014_repair_game_category_ids.sql — re-link games to their categories
-- ----------------------------------------------------------------------------
-- When the database moved to AWS RDS (2026-07-08), the six original categories
-- were recreated with new ids while the games kept their old category_id
-- values. The bulk load bypassed the games_category_id_fkey check, leaving
-- games pointing at ids that no longer exist. The admin Categories page counts
-- games by category_id, so nearly every category showed 0 games; the public
-- site groups by the legacy `category` name and was unaffected.
--
-- Re-point every orphaned category_id at the category whose name matches the
-- game's legacy `category` value. Games with a valid category_id are left
-- untouched, so admin reassignments made since the move are preserved.
--
-- Idempotent — safe to re-run.
--   node scripts/run-migration.mjs supabase/migrations/0014_repair_game_category_ids.sql
-- ============================================================================

begin;

update public.games g
set category_id = c.id
from public.categories c
where lower(c.name) = lower(g.category::text)
  and (
    g.category_id is null
    or not exists (select 1 from public.categories x where x.id = g.category_id)
  );

-- Abort if any game still references a missing category, so a partial repair
-- is never committed.
do $$
begin
  if exists (
    select 1 from public.games g
    where g.category_id is not null
      and not exists (select 1 from public.categories c where c.id = g.category_id)
  ) then
    raise exception 'games still reference missing categories';
  end if;
end $$;

commit;
