// Server-only game_sessions data access (Supabase).

import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Create a new active session. Returns the session id. */
export async function createSession(userId: string, gameId: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("game_sessions")
    .insert({ user_id: userId, game_id: gameId, status: "active" })
    .select("id")
    .single();
  if (error) throw new Error(`[supabase] createSession: ${error.message}`);
  return (data as { id: string }).id;
}

/** Mark a session as ended. Validates ownership via user_id. */
export async function endSession(sessionId: string, userId: string): Promise<void> {
  const db = getSupabaseAdmin();

  // Read started_at so ended_at is guaranteed >= started_at (the DB check
  // constraint) regardless of clock skew between this host and Supabase, or
  // µs→ms precision loss. We derive ended_at from the stored start + a buffer.
  const { data: row, error: readErr } = await db
    .from("game_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(`[supabase] endSession read: ${readErr.message}`);
  if (!row) return; // not found / not owned — nothing to end

  const startedMs = new Date((row as { started_at: string }).started_at).getTime();
  const endedAt = new Date(Math.max(Date.now(), startedMs + 1000)).toISOString();

  const { error } = await db
    .from("game_sessions")
    .update({ status: "ended", ended_at: endedAt })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(`[supabase] endSession: ${error.message}`);
}

/**
 * Returns the most-recently-played distinct game IDs for a user.
 * Used to power the "Continue playing" rail on the dashboard.
 */
export async function listRecentGameIds(
  userId: string,
  limit = 6,
): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("game_sessions")
    .select("game_id")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit * 4);

  if (error) throw new Error(`[supabase] listRecentGameIds: ${error.message}`);

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of (data ?? []) as { game_id: string }[]) {
    if (!seen.has(row.game_id)) {
      seen.add(row.game_id);
      ids.push(row.game_id);
      if (ids.length >= limit) break;
    }
  }
  return ids;
}
