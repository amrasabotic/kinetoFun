// Server-only games data access (Supabase / Postgres).
//
// Reads the `games` catalog table and maps snake_case rows onto the UI `Game`
// type. Same pattern as the user repository: server-only, behind the API, never
// imported by a Client Component.

import type { Game, GameCategory, GamePlayers } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface GameRow {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  category: GameCategory;
  players: GamePlayers;
  min_players: number;
  max_players: number;
  cover: string | null;
  cover_image: string | null;
  accent: string | null;
  rating: number | string | null;
  release_year: number | null;
  duration_minutes: number | null;
  featured: boolean;
}

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    category: row.category,
    players: row.players,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    cover: row.cover ?? "",
    coverImage: row.cover_image ?? undefined,
    accent: row.accent ?? "",
    rating: Number(row.rating ?? 0),
    releaseYear: row.release_year ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    featured: row.featured,
  };
}

export async function listGames(): Promise<Game[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
    .order("featured", { ascending: false })
    .order("title", { ascending: true });
  if (error) throw new Error(`[supabase] listGames: ${error.message}`);
  return (data as GameRow[]).map(toGame);
}

export async function getGameById(id: string): Promise<Game | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[supabase] getGameById: ${error.message}`);
  return data ? toGame(data as GameRow) : null;
}
