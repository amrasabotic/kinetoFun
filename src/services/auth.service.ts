import { users, CURRENT_USER_ID } from "@/mock";
import type { User } from "@/types";

/**
 * MOCK authentication only — there is no password checking, no token, and no
 * backend. It exists so the auth UI has something to call. Phase 2 replaces
 * this with real JWT auth against Supabase.
 */
export const authService = {
  /** Pretend to sign in. Matches by email if known, otherwise the default user. */
  login(email: string, _password: string): User {
    void _password;
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    return match ?? defaultUser();
  },

  /** Pretend to register, returning a fresh in-memory user. */
  signup(displayName: string, email: string, _password: string): User {
    void _password;
    return {
      id: `u-${Date.now()}`,
      username: displayName.trim().toLowerCase().replace(/\s+/g, "") || "player",
      displayName: displayName.trim() || "Player",
      email: email.trim(),
      avatarColor: "from-fuchsia-500 to-purple-600",
      level: 1,
      xp: 0,
      joinedAt: new Date().toISOString(),
      bio: "New to KinetoFun.",
    };
  },

  defaultUser,
};

function defaultUser(): User {
  return users.find((u) => u.id === CURRENT_USER_ID) ?? users[0];
}
