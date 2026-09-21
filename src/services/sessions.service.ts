// Client-side helpers for the game_sessions API.

/** Start a new play session. Returns the session id, or null if not signed in. */
export async function startSession(gameId: string): Promise<string | null> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to start session.");
  const json = (await res.json()) as { sessionId: string };
  return json.sessionId;
}

/** End an active play session. No-op if id is null. */
export async function endSession(sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  const res = await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
  if (!res.ok && res.status !== 401) {
    throw new Error("Failed to end session.");
  }
}

/** Most-recently-played distinct game IDs for the current user. */
export async function fetchRecentGameIds(): Promise<string[]> {
  const res = await fetch("/api/sessions/recent");
  if (!res.ok) return [];
  const json = (await res.json()) as { gameIds: string[] };
  return json.gameIds ?? [];
}
