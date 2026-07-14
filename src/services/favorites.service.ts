// Client-side helpers for the favorites API.

/** Fetch the current user's favorited game IDs. Empty array if not signed in. */
export async function fetchFavoriteGameIds(): Promise<string[]> {
  const res = await fetch("/api/favorites");
  if (!res.ok) return [];
  const json = (await res.json()) as { gameIds: string[] };
  return json.gameIds ?? [];
}

/** Add a game to favorites. */
export async function addFavorite(gameId: string): Promise<void> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) throw new Error("Failed to add favorite.");
}

/** Remove a game from favorites. */
export async function removeFavorite(gameId: string): Promise<void> {
  const res = await fetch(`/api/favorites/${gameId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove favorite.");
}
