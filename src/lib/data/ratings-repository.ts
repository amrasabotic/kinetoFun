// Server-only game ratings data access (Supabase).
// Handles user-submitted 1-5 star ratings for games.

import { getSupabaseAdmin } from "@/lib/supabase/server";

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

/**
 * Upsert a user's rating for a game (one per user/game pair).
 * If the user already rated this game, their rating is updated.
 */
export async function upsertRating(
  userId: string,
  gameId: string,
  score: number,
): Promise<UserRating> {
  const { data, error } = await getSupabaseAdmin()
    .from("game_ratings")
    .upsert(
      { user_id: userId, game_id: gameId, score },
      { onConflict: "user_id,game_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(`[supabase] upsertRating: ${error.message}`);
  const row = data as RatingRow;
  return {
    gameId: row.game_id,
    score: row.score,
    updatedAt: row.updated_at,
  };
}

/**
 * Get a user's existing rating for a game, or null if they haven't rated it.
 */
export async function getUserRating(
  userId: string,
  gameId: string,
): Promise<UserRating | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("game_ratings")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) throw new Error(`[supabase] getUserRating: ${error.message}`);
  if (!data) return null;

  const row = data as RatingRow;
  return {
    gameId: row.game_id,
    score: row.score,
    updatedAt: row.updated_at,
  };
}
