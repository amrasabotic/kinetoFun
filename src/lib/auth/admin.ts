// Admin authorization helpers for Route Handlers.
//
// Unlike the DAL's `requireAdmin`/`requireSuperAdmin` (which redirect — for
// Server Components), these return the user or null so a handler can respond
// with a JSON 401/403. The authoritative role comes from the DB via the DAL.

import { getCurrentUser } from "./dal";
import type { AuthUser } from "@/types/auth";

/** Current user if they are admin or superadmin, else null. */
export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.role === "admin" || user.role === "superadmin" ? user : null;
}

/** Current user if they are superadmin, else null. */
export async function getSuperAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.role === "superadmin" ? user : null;
}
