// Frontend auth client — the browser-side boundary to the real auth API.
//
// This replaces the old in-memory mock. It only talks to `/api/auth/*` over
// fetch (the JWT lives in an httpOnly cookie, so there is no token to handle
// here) and maps the canonical `AuthUser` onto the richer UI `User` so every
// existing screen keeps working. It must NOT import `@/lib/auth/*` (server-only).

import type { User } from "@/types";
import type { AuthError, AuthSuccess, AuthUser } from "@/types/auth";

// Literal gradient strings (kept verbatim so Tailwind includes them) used as
// deterministic avatar colors until per-user art/profile fields are stored.
const AVATAR_GRADIENTS = [
  "from-fuchsia-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-lime-500 to-green-600",
] as const;

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

/**
 * Project the auth identity onto the UI `User`, filling display/game fields
 * that don't live in the auth database yet (level, xp, avatar). When those
 * move to the DB, this mapper is the only place that changes.
 */
export function toAppUser(authUser: AuthUser): User {
  const localPart = authUser.email.split("@")[0] ?? "player";
  return {
    id: authUser.id,
    username: localPart.toLowerCase().replace(/[^a-z0-9_]/g, "") || "player",
    displayName: authUser.name,
    email: authUser.email,
    avatarColor: gradientFor(authUser.id),
    level: 1,
    xp: 0,
    joinedAt: authUser.createdAt,
  };
}

/** Thrown on a non-2xx auth response; carries the status and any field errors. */
export class AuthRequestError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.fields = fields;
  }
}

async function readUser(res: Response): Promise<User> {
  const data = (await res.json().catch(() => null)) as
    | AuthSuccess
    | AuthError
    | null;

  if (!res.ok || !data || !("user" in data)) {
    const err = (data ?? {}) as AuthError;
    throw new AuthRequestError(
      err.error ?? "Something went wrong. Please try again.",
      res.status,
      err.fields,
    );
  }
  return toAppUser(data.user);
}

export const authService = {
  /** Register a new account; the server sets the session cookie on success. */
  async register(name: string, email: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return readUser(res);
  },

  /** Sign in with credentials; the server sets the session cookie on success. */
  async login(email: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return readUser(res);
  },

  /** Clear the session cookie (this device). */
  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
  },

  /** Revoke every session for the user ("sign out everywhere"). */
  async logoutAll(): Promise<void> {
    await fetch("/api/auth/logout-all", { method: "POST" });
  },

  /** Restore the session from the cookie. Returns `null` when not signed in. */
  async me(): Promise<User | null> {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as AuthSuccess | null;
    return data?.user ? toAppUser(data.user) : null;
  },
};
