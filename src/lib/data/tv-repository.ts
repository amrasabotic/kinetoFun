// Server-only tv_devices / tv_sessions data access (Postgres via pg).

import { execute, query, queryOne } from "@/lib/db/server";
import {
  generatePairingCode,
  isExpired,
  pairingExpiry,
  type TvSessionStatus,
} from "@/lib/tv/pairing";

/** A row of public.tv_sessions, snake_case as stored. */
export interface TvSessionRow {
  id: string;
  device_id: string | null;
  pairing_code: string;
  secret_hash: string;
  status: TvSessionStatus;
  user_id: string | null;
  auth_session_id: string | null;
  created_at: string;
  expires_at: string;
  authenticated_at: string | null;
  last_seen_at: string | null;
}

const SESSION_COLUMNS = `id, device_id, pairing_code, secret_hash, status,
  user_id, auth_session_id, created_at, expires_at, authenticated_at, last_seen_at`;

/**
 * Look up a TV device by its stable key, creating it on first sight. A real Pi
 * passes something like 'KF-TV-001'; a browser simulating a TV gets whatever
 * key the caller generated for it.
 */
export async function findOrCreateDevice(
  deviceKey: string,
  name?: string | null,
): Promise<string> {
  // ON CONFLICT DO UPDATE (rather than DO NOTHING) so the RETURNING clause
  // always yields a row, even when the device already existed.
  const row = await queryOne<{ id: string }>(
    `INSERT INTO public.tv_devices (device_key, name, last_seen_at)
     VALUES ($1, $2, now())
     ON CONFLICT (device_key) DO UPDATE
       SET last_seen_at = now(),
           name = COALESCE(EXCLUDED.name, public.tv_devices.name)
     RETURNING id`,
    [deviceKey, name ?? null],
  );
  if (!row) throw new Error("[db] findOrCreateDevice: no row returned");
  return row.id;
}

/**
 * Create a `waiting` pairing session with a fresh unique code. Retries on the
 * (very unlikely) unique-index collision rather than trusting a single draw.
 */
export async function createTvSession(input: {
  deviceId: string | null;
  secretHash: string;
}): Promise<TvSessionRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pairingCode = generatePairingCode();
    try {
      const row = await queryOne<TvSessionRow>(
        `INSERT INTO public.tv_sessions
           (device_id, pairing_code, secret_hash, status, expires_at, last_seen_at)
         VALUES ($1, $2, $3, 'waiting', $4, now())
         RETURNING ${SESSION_COLUMNS}`,
        [input.deviceId, pairingCode, input.secretHash, pairingExpiry()],
      );
      if (row) return row;
    } catch (err) {
      // 23505 = unique_violation on tv_sessions_pairing_code_key.
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  throw new Error("[db] createTvSession: could not allocate a unique code");
}

export async function findByCode(code: string): Promise<TvSessionRow | null> {
  return queryOne<TvSessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM public.tv_sessions WHERE pairing_code = $1`,
    [code],
  );
}

export async function findById(id: string): Promise<TvSessionRow | null> {
  return queryOne<TvSessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM public.tv_sessions WHERE id = $1`,
    [id],
  );
}

/**
 * The effective status of a row, lazily retiring a `waiting` session whose
 * window has closed. Expiry only applies to `waiting`: once a phone has paired,
 * the TV keeps its session until someone ends it.
 *
 * Returns the status the caller should act on. Never throws on the write — a
 * failed flip just means we re-evaluate on the next request.
 */
export async function expireIfStale(row: TvSessionRow): Promise<TvSessionStatus> {
  if (row.status !== "waiting" || !isExpired(row.expires_at)) return row.status;
  try {
    await execute(
      `UPDATE public.tv_sessions SET status = 'expired'
       WHERE id = $1 AND status = 'waiting'`,
      [row.id],
    );
  } catch (err) {
    console.error("[db] expireIfStale:", err);
  }
  return "expired";
}

/**
 * Attach an authenticated user. Guarded on `status = 'waiting'` so the update
 * itself is the concurrency check: two phones racing the same code means
 * exactly one gets a row back.
 */
export async function markAuthenticated(
  id: string,
  userId: string,
): Promise<TvSessionRow | null> {
  return queryOne<TvSessionRow>(
    `UPDATE public.tv_sessions
     SET status = 'authenticated', user_id = $2, authenticated_at = now()
     WHERE id = $1 AND status = 'waiting' AND expires_at > now()
     RETURNING ${SESSION_COLUMNS}`,
    [id, userId],
  );
}

/** Record the auth session minted for the TV and mark the pairing complete. */
export async function markReady(
  id: string,
  authSessionId: string | null,
): Promise<TvSessionRow | null> {
  return queryOne<TvSessionRow>(
    `UPDATE public.tv_sessions
     SET status = 'ready', auth_session_id = $2, last_seen_at = now()
     WHERE id = $1 AND status IN ('authenticated', 'ready')
     RETURNING ${SESSION_COLUMNS}`,
    [id, authSessionId],
  );
}

/** Tear the pairing down. Terminal — the TV must create a new session. */
export async function markEnded(id: string): Promise<void> {
  await execute(
    `UPDATE public.tv_sessions SET status = 'ended' WHERE id = $1`,
    [id],
  );
}

/**
 * Revoke exactly the auth session that was minted for a TV. Deliberately
 * targeted: the paired user stays signed in everywhere else, including on the
 * phone they paired with.
 */
export async function revokeTvAuthSession(authSessionId: string): Promise<void> {
  try {
    await execute(`DELETE FROM public.auth_sessions WHERE id = $1`, [authSessionId]);
  } catch (err) {
    console.error("[db] revokeTvAuthSession:", err);
  }
}

/** Best-effort liveness ping from the TV's status poll. */
export async function touchLastSeen(
  id: string,
  deviceId: string | null,
): Promise<void> {
  try {
    await execute(`UPDATE public.tv_sessions SET last_seen_at = now() WHERE id = $1`, [id]);
    if (deviceId) {
      await execute(`UPDATE public.tv_devices SET last_seen_at = now() WHERE id = $1`, [
        deviceId,
      ]);
    }
  } catch (err) {
    console.error("[db] touchLastSeen:", err);
  }
}

/**
 * Retire any other sessions still waiting on the same device, so a TV that
 * reloads repeatedly doesn't leave a trail of live codes pointing at it.
 */
export async function endOtherWaitingSessions(
  deviceId: string,
  keepSessionId: string,
): Promise<void> {
  try {
    await execute(
      `UPDATE public.tv_sessions SET status = 'ended'
       WHERE device_id = $1 AND id <> $2 AND status = 'waiting'`,
      [deviceId, keepSessionId],
    );
  } catch (err) {
    console.error("[db] endOtherWaitingSessions:", err);
  }
}

/** Display name of the paired user, for the TV's welcome screen. */
export async function findPairedUserName(userId: string): Promise<string | null> {
  const row = await queryOne<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1 AND active IS NOT FALSE`,
    [userId],
  );
  return row?.name ?? null;
}

/** Sessions for a user (not currently surfaced in the UI; useful for support). */
export async function listSessionsForUser(userId: string): Promise<TvSessionRow[]> {
  return query<TvSessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM public.tv_sessions
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId],
  );
}
