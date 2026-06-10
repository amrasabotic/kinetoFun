// Frontend games client + pure selectors.
//
// The catalog now lives in Supabase. Client code never queries Supabase
// directly — it fetches the public `/api/games` endpoints (the data boundary),
// then derives views with the pure selectors below. Consume via the
// `useGames()` hook (which caches the fetch); use the selectors over its
// `games` array. Must NOT import `@/lib/*` (server-only).

import type { Game, GameCategory } from "@/types";

/** Fetch the full catalog. */
export async function fetchGames(): Promise<Game[]> {
  const res = await fetch("/api/games", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load games.");
  const data = (await res.json()) as { games: Game[] };
  return data.games;
}

/** Fetch one game by id (null when not found). */
export async function fetchGame(id: string): Promise<Game | null> {
  const res = await fetch(`/api/games/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load game.");
  const data = (await res.json()) as { game: Game };
  return data.game;
}

// ── Pure selectors over a games array (no I/O) ───────────────────────────────
export const selectFeatured = (games: Game[]): Game[] =>
  games.filter((g) => g.featured);

export const selectByCategory = (games: Game[], category: GameCategory): Game[] =>
  games.filter((g) => g.category === category);

export const selectCategories = (games: Game[]): GameCategory[] =>
  Array.from(new Set(games.map((g) => g.category)));

export const findGame = (games: Game[], id: string): Game | undefined =>
  games.find((g) => g.id === id);

export const searchGames = (games: Game[], query: string): Game[] => {
  const q = query.trim().toLowerCase();
  if (!q) return games;
  return games.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.tagline.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q),
  );
};
