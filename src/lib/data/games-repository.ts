// Server-only games data access (Supabase / Postgres).
//
// Reads the `games` catalog table and maps snake_case rows onto the UI `Game`
// type. Same pattern as the user repository: server-only, behind the API, never
// imported by a Client Component.

import type {
  Game,
  GameCategory,
  GamePlayers,
  GameStatus,
  GameDifficulty,
  GameAgeGroup,
} from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * True when a Postgres/PostgREST error is "undefined column" (42703) — used to
 * detect a DB that hasn't had migration 0004 applied yet, so public reads can
 * gracefully fall back instead of 500ing.
 */
function isUndefinedColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" ||
    /column .* does not exist/i.test(error.message ?? "")
  );
}

interface GameRow {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  short_description: string | null;
  category: GameCategory;
  category_id: string | null;
  players: GamePlayers;
  min_players: number;
  max_players: number;
  cover: string | null;
  cover_image: string | null;
  thumbnail: string | null;
  accent: string | null;
  rating: number | string | null;
  release_year: number | null;
  duration_minutes: number | null;
  difficulty: GameDifficulty | null;
  age_group: string | null;
  status: GameStatus | null;
  featured: boolean;
  play_count: number | null;
  created_at?: string;
}

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    category: row.category,
    categoryId: row.category_id ?? undefined,
    players: row.players,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    cover: row.cover ?? "",
    coverImage: row.cover_image ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    accent: row.accent ?? "",
    rating: Number(row.rating ?? 0),
    releaseYear: row.release_year ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    difficulty: row.difficulty ?? "medium",
    ageGroup: (row.age_group as GameAgeGroup) ?? "6-8",
    status: row.status ?? "published",
    featured: row.featured,
    playCount: row.play_count ?? 0,
    createdAt: row.created_at ?? undefined,
  };
}

/**
 * Public catalog read — PUBLISHED games only. Draft/Archived games are hidden
 * from normal users (the admin list uses `listAllGames`).
 *
 * Resilient to a pre-migration DB: if the `status` column doesn't exist yet
 * (migration 0004 not applied), it falls back to listing every game so the
 * public catalog never goes down. Once the column exists, it filters to
 * published only.
 */
export async function listGames(): Promise<Game[]> {
  const db = getSupabaseAdmin();
  const first = await db
    .from("games")
    .select("*")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("title", { ascending: true });

  if (first.error && isUndefinedColumn(first.error)) {
    const fallback = await db
      .from("games")
      .select("*")
      .order("featured", { ascending: false })
      .order("title", { ascending: true });
    if (fallback.error) throw new Error(`[supabase] listGames: ${fallback.error.message}`);
    return (fallback.data as GameRow[]).map(toGame);
  }
  if (first.error) throw new Error(`[supabase] listGames: ${first.error.message}`);
  return (first.data as GameRow[]).map(toGame);
}

/** Admin read — every game regardless of status. */
export async function listAllGames(): Promise<Game[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*")
    .order("featured", { ascending: false })
    .order("title", { ascending: true });
  if (error) throw new Error(`[supabase] listAllGames: ${error.message}`);
  return (data as GameRow[]).map(toGame);
}

export async function getGameById(id: string): Promise<Game | null> {
  const db = getSupabaseAdmin();
  const first = await db
    .from("games")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (first.error && isUndefinedColumn(first.error)) {
    const fallback = await db.from("games").select("*").eq("id", id).maybeSingle();
    if (fallback.error) throw new Error(`[supabase] getGameById: ${fallback.error.message}`);
    return fallback.data ? toGame(fallback.data as GameRow) : null;
  }
  if (first.error) throw new Error(`[supabase] getGameById: ${first.error.message}`);
  return first.data ? toGame(first.data as GameRow) : null;
}

// ── Admin writes ─────────────────────────────────────────────────────────────

/**
 * Map a UI `Game` onto the snake_case DB columns (for insert/update).
 * `play_count` is system-managed (sessions) and deliberately NOT written here.
 */
function toGameRow(game: Game): Record<string, unknown> {
  return {
    id: game.id,
    title: game.title,
    tagline: game.tagline,
    description: game.description,
    short_description: game.shortDescription ?? "",
    category: game.category,
    category_id: game.categoryId ?? null,
    players: game.players,
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    cover: game.cover,
    cover_image: game.coverImage ?? null,
    thumbnail: game.thumbnail ?? null,
    accent: game.accent,
    rating: game.rating,
    release_year: game.releaseYear,
    duration_minutes: game.durationMinutes,
    difficulty: game.difficulty ?? "medium",
    age_group: game.ageGroup ?? "6-8",
    status: game.status ?? "published",
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

// ── Bulk admin actions ───────────────────────────────────────────────────────

/** Set the publication status on many games at once. */
export async function bulkSetStatus(ids: string[], status: GameStatus): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabaseAdmin()
    .from("games")
    .update({ status })
    .in("id", ids);
  if (error) throw new Error(`[supabase] bulkSetStatus: ${error.message}`);
}

/** Reassign many games to a category (also syncs the legacy enum when known). */
export async function bulkSetCategory(
  ids: string[],
  categoryId: string,
  categoryName?: GameCategory,
): Promise<void> {
  if (ids.length === 0) return;
  const patch: Record<string, unknown> = { category_id: categoryId };
  if (categoryName) patch.category = categoryName;
  const { error } = await getSupabaseAdmin().from("games").update(patch).in("id", ids);
  if (error) throw new Error(`[supabase] bulkSetCategory: ${error.message}`);
}

/** Delete many games (cascades scores/sessions). */
export async function bulkDeleteGames(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabaseAdmin().from("games").delete().in("id", ids);
  if (error) throw new Error(`[supabase] bulkDeleteGames: ${error.message}`);
}
