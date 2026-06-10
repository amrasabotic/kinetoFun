// Cookie-backed session management. The signed JWT is stored in an httpOnly
// cookie so client-side JavaScript can never read it (the preferred storage
// from the task spec). These helpers may only run in Route Handlers / Server
// Functions, because `cookies()` can only *write* there.

import { cookies } from "next/headers";
import { authConfig, cookieOptions } from "./config";
import { signToken, verifyToken } from "./jwt";
import type { AuthUser, JwtPayload } from "@/types/auth";

/** Sign a token for the user and set it as the session cookie. */
export async function createSession(user: AuthUser): Promise<string> {
  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });
  const store = await cookies();
  store.set(authConfig.cookieName, token, cookieOptions());
  return token;
}

/** Remove the session cookie (logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(authConfig.cookieName, "", cookieOptions(0));
}

/**
 * Read + verify the session token from the cookie. Returns the decoded JWT
 * payload, or `null` if there's no cookie or the token is invalid/expired.
 * This does NOT hit the database — see the DAL for that.
 */
export async function getSessionPayload(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(authConfig.cookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}
