// Server-only game_sessions data access (Postgres via pg).

import { execute, query, queryOne } from "@/lib/db/server";

export async function createSession(
  userId: string,
  gameId: string,
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO public.game_sessions (user_id, game_id, status)
     VALUES ($1, $2, 'active')
     RETURNING id`,
    [userId, gameId],
  );
  if (!row) throw new Error("[db] createSession: no row returned");
  return row.id;
}

export async function endSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const row = await queryOne<{ started_at: string }>(
    `SELECT started_at FROM public.game_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  if (!row) return;

  const startedMs = new Date(row.started_at).getTime();
  const endedAt = new Date(Math.max(Date.now(), startedMs + 1000)).toISOString();

  await execute(
    `UPDATE public.game_sessions
     SET status = 'ended', ended_at = $1
     WHERE id = $2 AND user_id = $3`,
    [endedAt, sessionId, userId],
  );
}

export async function listRecentGameIds(
  userId: string,
  limit = 6,
): Promise<string[]> {
  const data = await query<{ game_id: string }>(
    `SELECT game_id FROM public.game_sessions
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [userId, limit * 4],
  );

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of data) {
    if (!seen.has(row.game_id)) {
      seen.add(row.game_id);
      ids.push(row.game_id);
      if (ids.length >= limit) break;
    }
  }
  return ids;
}
