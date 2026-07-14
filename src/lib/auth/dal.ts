// Data Access Layer — the *secure* auth check.
//
// Unlike the proxy (which does a fast, optimistic cookie check), the DAL verifies
// the session AND loads the user from the database. This is the function server
// code should call when it needs the real, current user. Results are memoized
// per request with React `cache`, so calling it in several places in one render
// hits the DB once.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionPayload } from "./session";
import { getSessionRepository } from "./session-repository";
import { getUserRepository } from "./repository";
import { toAuthUser } from "./serialize";
import type { AuthUser } from "@/types/auth";

/** Verify the session and load the current user, or `null` if not signed in. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSessionPayload();
  if (!session?.sub) return null;

  // Server-side revocation: a tracked session (one carrying a `sid`) must still
  // exist and be unexpired. Tokens minted before session tracking have no sid
  // and fall through to the stateless check (they expire on their own).
  if (session.sid) {
    const record = await getSessionRepository().findValid(session.sid);
    if (!record || record.userId !== session.sub) return null;
  }

  const record = await getUserRepository().findById(session.sub);
  if (!record || record.active === false) return null;
  return toAuthUser(record);
});

/**
 * Require an authenticated user. For Server Components / Server Actions:
 * redirects to `/login` when there is no valid session. (Route Handlers should
 * return a 401 instead — use `getCurrentUser` there.)
 */
export const requireUser = cache(async (): Promise<AuthUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Require an admin or superadmin user. For Server Components:
 * redirects to `/` when the user lacks admin privileges.
 */
export const requireAdmin = cache(async (): Promise<AuthUser> => {
  const user = await getCurrentUser();
  if (!user || !["admin", "superadmin"].includes(user.role)) redirect("/");
  return user;
});

/**
 * Require a superadmin user. For Server Components:
 * redirects to `/` when the user is not superadmin.
 */
export const requireSuperAdmin = cache(async (): Promise<AuthUser> => {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") redirect("/");
  return user;
});
