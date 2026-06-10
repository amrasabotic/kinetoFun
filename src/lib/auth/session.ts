// Cookie-backed session management. The signed JWT is stored in an httpOnly
// cookie so client-side JavaScript can never read it (the preferred storage
// from the task spec). These helpers may only run in Route Handlers / Server
// Functions, because `cookies()` can only *write* there.
//
// Sessions are also tracked server-side (a row per session in `auth_sessions`,
// keyed by the JWT's `sid` claim) so they can be revoked: logout deletes the
// row, "sign out everywhere" deletes them all, and the DAL rejects any token
// whose row is gone or expired.

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { authConfig, cookieOptions } from "./config";
import { signToken, verifyToken } from "./jwt";
import { getSessionRepository } from "./session-repository";
import type { AuthUser } from "@/types/auth";

/** Optional request metadata recorded against the session (for device lists). */
export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

/** Sign a token for the user, persist a revocable session, and set the cookie. */
export async function createSession(
  user: AuthUser,
  meta: SessionMeta = {},
): Promise<string> {
  const sid = randomUUID();
  const expiresAt = new Date(
    Date.now() + authConfig.maxAgeSeconds * 1000,
  ).toISOString();

  // Persist the session row first. If it fails, fall back to a stateless token
  // (no `sid`) so the user can still sign in — the DAL skips the revocation
  // check when there's no sid.
  let useSid = true;
  try {
    await getSessionRepository().create({
      id: sid,
      userId: user.id,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    });
  } catch (err) {
    console.error("[auth] session persist failed; issuing stateless token:", err);
    useSid = false;
  }

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    ...(useSid ? { sid } : {}),
  });

  const store = await cookies();
  store.set(authConfig.cookieName, token, cookieOptions());
  return token;
}

/** Remove the session cookie AND revoke its server-side row (logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(authConfig.cookieName)?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sid) {
      try {
        await getSessionRepository().delete(payload.sid);
      } catch (err) {
        console.error("[auth] failed to delete session row on logout:", err);
      }
    }
  }

  store.set(authConfig.cookieName, "", cookieOptions(0));
}

/** Revoke every session for a user ("sign out everywhere") and clear this cookie. */
export async function destroyAllSessions(userId: string): Promise<void> {
  try {
    await getSessionRepository().deleteAllForUser(userId);
  } catch (err) {
    console.error("[auth] failed to delete all session rows:", err);
  }
  const store = await cookies();
  store.set(authConfig.cookieName, "", cookieOptions(0));
}

/**
 * Read + verify the session token from the cookie. Returns the decoded JWT
 * payload, or `null` if there's no cookie or the token is invalid/expired.
 * This does NOT hit the database — see the DAL for the authoritative check.
 */
export async function getSessionPayload() {
  const store = await cookies();
  const token = store.get(authConfig.cookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}
