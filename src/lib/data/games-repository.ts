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

// ── Admin writes ─────────────────────────────────────────────────────────────

/** Map a UI `Game` onto the snake_case DB columns (for insert/update). */
function toGameRow(game: Game): Record<string, unknown> {
  return {
    id: game.id,
    title: game.title,
    tagline: game.tagline,
    description: game.description,
    category: game.category,
    players: game.players,
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    cover: game.cover,
    cover_image: game.coverImage ?? null,
    accent: game.accent,
    rating: game.rating,
    release_year: game.releaseYear,
    duration_minutes: game.durationMinutes,
    featured: game.featured ?? false,
  };
}

export async function createGame(game: Game): Promise<Game> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .insert(toGameRow(game))
    .select("*")
    .single();
  if (error) throw new Error(`[supabase] createGame: ${error.message}`);
  return toGame(data as GameRow);
}

export async function updateGame(id: string, game: Game): Promise<Game> {
  // `id` is the slug primary key — keep it stable; update everything else.
  const { id: _omit, ...row } = toGameRow(game) as { id: string } & Record<string, unknown>;
  void _omit;
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`[supabase] updateGame: ${error.message}`);
  return toGame(data as GameRow);
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("games").delete().eq("id", id);
  if (error) throw new Error(`[supabase] deleteGame: ${error.message}`);
}
