// Server-only game ratings data access (Postgres via pg).

import { queryOne } from "@/lib/db/server";

interface RatingRow {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface UserRating {
  gameId: string;
  score: number;
  updatedAt: string;
}

export async function upsertRating(
  userId: string,
  gameId: string,
  score: number,
): Promise<UserRating> {
  const row = await queryOne<RatingRow>(
    `INSERT INTO public.game_ratings (user_id, game_id, score)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, game_id)
     DO UPDATE SET score = EXCLUDED.score, updated_at = now()
     RETURNING *`,
    [userId, gameId, score],
  );
  if (!row) throw new Error("[db] upsertRating: no row returned");
  return {
    gameId: row.game_id,
    score: row.score,
    updatedAt: row.updated_at,
  };
}

export async function getUserRating(
  userId: string,
  gameId: string,
): Promise<UserRating | null> {
  const row = await queryOne<RatingRow>(
    `SELECT * FROM public.game_ratings
     WHERE user_id = $1 AND game_id = $2`,
    [userId, gameId],
  );
  if (!row) return null;
  return {
    gameId: row.game_id,
    score: row.score,
    updatedAt: row.updated_at,
  };
}
