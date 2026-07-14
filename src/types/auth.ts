// Authentication domain types for KinetoFun.
//
// These are deliberately separate from the rich UI `User` in `@/types` (which
// carries display/game fields like level, xp, avatarColor). The auth layer owns
// only the canonical identity fields that live in the database. The session
// layer maps an `AuthUser` onto the UI `User` so existing screens keep working.
//
// This split is what lets the system grow into game sessions, leaderboards,
// multiplayer identity, and subscriptions without restructuring auth.

/** A user as exposed to the rest of the app (never includes the password hash). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: string; // ISO timestamp
  username?: string;
  bio?: string;
  avatarColor?: string;
  active?: boolean;
  xp?: number;
  level?: number;
  largeText?: boolean;
  reduceMotion?: boolean;
}

/**
 * A raw user row as stored in / returned by the database (snake_case to match
 * the Postgres schema). Stays inside the repository + serialization boundary —
 * the `password_hash` must never leave the server.
 */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin' | 'superadmin';
  created_at: string;
  username?: string;
  bio?: string;
  avatar_color?: string;
  active?: boolean;
  xp?: number;
  level?: number;
  large_text?: boolean;
  reduce_motion?: boolean;
}

/** Claims embedded in the signed JWT. `sub` is the user id. */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role?: 'user' | 'admin' | 'superadmin';
  /** Server-side session id (row in `auth_sessions`); enables revocation. */
  sid?: string;
  iat?: number;
  exp?: number;
}

/** Request body for `POST /api/auth/register`. */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/** Request body for `POST /api/auth/login`. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Successful auth response (register / login / me). */
export interface AuthSuccess {
  user: AuthUser;
}

/** Error response shape used by every auth endpoint. */
export interface AuthError {
  error: string;
  /** Per-field validation messages, when the failure is a bad request body. */
  fields?: Record<string, string[]>;
}
