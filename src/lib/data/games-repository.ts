// Server-only games data access (Postgres via pg).

import type {
  Game,
  GameCategory,
  GamePlayers,
  GameStatus,
  GameDifficulty,
  GameAgeGroup,
} from "@/types";
import {
  execute,
  isUndefinedColumn,
  query,
  queryOne,
} from "@/lib/db/server";

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
  rating_count: number | null;
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
    ratingCount: row.rating_count ?? 0,
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

export async function listGames(): Promise<Game[]> {
  try {
    const rows = await query<GameRow>(
      `SELECT * FROM public.games
       WHERE status = 'published'
       ORDER BY featured DESC, title ASC`,
    );
    return rows.map(toGame);
  } catch (err) {
    if (!isUndefinedColumn(err)) throw err;
    const rows = await query<GameRow>(
      `SELECT * FROM public.games ORDER BY featured DESC, title ASC`,
    );
    return rows.map(toGame);
  }
}

export async function listAllGames(): Promise<Game[]> {
  const rows = await query<GameRow>(
    `SELECT * FROM public.games ORDER BY featured DESC, title ASC`,
  );
  return rows.map(toGame);
}

export async function getGameById(id: string): Promise<Game | null> {
  try {
    const row = await queryOne<GameRow>(
      `SELECT * FROM public.games WHERE id = $1 AND status = 'published'`,
      [id],
    );
    return row ? toGame(row) : null;
  } catch (err) {
    if (!isUndefinedColumn(err)) throw err;
    const row = await queryOne<GameRow>(
      `SELECT * FROM public.games WHERE id = $1`,
      [id],
    );
    return row ? toGame(row) : null;
  }
}

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
  const r = toGameRow(game);
  const row = await queryOne<GameRow>(
    `INSERT INTO public.games (
       id, title, tagline, description, short_description, category, category_id,
       players, min_players, max_players, cover, cover_image, thumbnail, accent,
       rating, release_year, duration_minutes, difficulty, age_group, status, featured
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
     ) RETURNING *`,
    [
      r.id,
      r.title,
      r.tagline,
      r.description,
      r.short_description,
      r.category,
      r.category_id,
      r.players,
      r.min_players,
      r.max_players,
      r.cover,
      r.cover_image,
      r.thumbnail,
      r.accent,
      r.rating,
      r.release_year,
      r.duration_minutes,
      r.difficulty,
      r.age_group,
      r.status,
      r.featured,
    ],
  );
  if (!row) throw new Error("[db] createGame: no row returned");
  return toGame(row);
}

export async function updateGame(id: string, game: Game): Promise<Game> {
  const r = toGameRow(game);
  const row = await queryOne<GameRow>(
    `UPDATE public.games SET
       title = $2, tagline = $3, description = $4, short_description = $5,
       category = $6, category_id = $7, players = $8, min_players = $9,
       max_players = $10, cover = $11, cover_image = $12, thumbnail = $13,
       accent = $14, rating = $15, release_year = $16, duration_minutes = $17,
       difficulty = $18, age_group = $19, status = $20, featured = $21
     WHERE id = $1
     RETURNING *`,
    [
      id,
      r.title,
      r.tagline,
      r.description,
      r.short_description,
      r.category,
      r.category_id,
      r.players,
      r.min_players,
      r.max_players,
      r.cover,
      r.cover_image,
      r.thumbnail,
      r.accent,
      r.rating,
      r.release_year,
      r.duration_minutes,
      r.difficulty,
      r.age_group,
      r.status,
      r.featured,
    ],
  );
  if (!row) throw new Error("[db] updateGame: not found");
  return toGame(row);
}

export async function deleteGame(id: string): Promise<void> {
  await execute(`DELETE FROM public.games WHERE id = $1`, [id]);
}

export async function bulkSetStatus(
  ids: string[],
  status: GameStatus,
): Promise<void> {
  if (ids.length === 0) return;
  await execute(`UPDATE public.games SET status = $1 WHERE id = ANY($2::text[])`, [
    status,
    ids,
  ]);
}

export async function bulkSetCategory(
  ids: string[],
  categoryId: string,
  categoryName?: GameCategory,
): Promise<void> {
  if (ids.length === 0) return;
  if (categoryName) {
    await execute(
      `UPDATE public.games SET category_id = $1, category = $2 WHERE id = ANY($3::text[])`,
      [categoryId, categoryName, ids],
    );
  } else {
    await execute(
      `UPDATE public.games SET category_id = $1 WHERE id = ANY($2::text[])`,
      [categoryId, ids],
    );
  }
}

export async function bulkDeleteGames(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await execute(`DELETE FROM public.games WHERE id = ANY($1::text[])`, [ids]);
}
