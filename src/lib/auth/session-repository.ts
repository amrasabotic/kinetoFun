// Session persistence boundary — tracks issued sessions so they can be revoked.
//
// The JWT in the cookie carries a `sid` (session id); a matching row must exist
// here (and not be expired) for the session to be considered valid by the DAL.
// Deleting a row revokes that session server-side; deleting all rows for a user
// is "sign out everywhere". Same swappable pattern as the user repository:
// Supabase (`auth_sessions` table) when configured, a local file store otherwise.

import {
  SupabaseSessionRepository,
  isSupabaseConfigured,
} from "./repositories/supabase-session-repository";
import { LocalSessionRepository } from "./repositories/local-session-repository";

/** A persisted session, as needed for the validity check. */
export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string; // ISO
}

/** Fields needed to persist a new session. */
export interface NewSession {
  id: string;
  userId: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: string; // ISO
}

export interface SessionRepository {
  create(session: NewSession): Promise<void>;
  /** Returns the session if it exists and has not expired, else null. */
  findValid(id: string): Promise<SessionRecord | null>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}

let cached: SessionRepository | null = null;

/** Get the active session repository (memoized). */
export function getSessionRepository(): SessionRepository {
  if (cached) return cached;
  cached = isSupabaseConfigured()
    ? new SupabaseSessionRepository()
    : new LocalSessionRepository();
  return cached;
}
