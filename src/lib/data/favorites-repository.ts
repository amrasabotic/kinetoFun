// Server-only favorites (wishlist) data access (Postgres via pg).

import { execute, query } from "@/lib/db/server";

export async function listFavoriteGameIds(userId: string): Promise<string[]> {
  const rows = await query<{ game_id: string }>(
    `SELECT game_id FROM public.favorites WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => r.game_id);
}

export async function addFavorite(userId: string, gameId: string): Promise<void> {
  await execute(
    `INSERT INTO public.favorites (user_id, game_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, game_id) DO NOTHING`,
    [userId, gameId],
  );
}

export async function removeFavorite(userId: string, gameId: string): Promise<void> {
  await execute(
    `DELETE FROM public.favorites WHERE user_id = $1 AND game_id = $2`,
    [userId, gameId],
  );
}
