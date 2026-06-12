// User persistence boundary.
//
// Everything above this line (route handlers, DAL, session) depends only on the
// `UserRepository` interface — never on a concrete database. That is what makes
// the system "Supabase as the database only, swappable later": today we select
// a Supabase (Postgres/PostgREST) implementation when it's configured, and a
// local file-backed store otherwise so the app is fully functional with zero
// setup. Adding game sessions / leaderboards later means adding new repositories
// alongside this one, not rewriting auth.

import type { UserRecord } from "@/types/auth";
import {
  SupabaseUserRepository,
  isSupabaseConfigured,
} from "./repositories/supabase-user-repository";
import { LocalUserRepository } from "./repositories/local-user-repository";

/** Fields needed to create a user. The hash is computed before it gets here. */
export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: NewUser): Promise<UserRecord>;
  update(id: string, updates: Partial<{ name: string; username: string; bio: string; avatar_color: string }>): Promise<UserRecord>;
  addXp(id: string, amount: number): Promise<{ xp: number; level: number }>;
}

let cached: UserRepository | null = null;

/** Get the active user repository (memoized). */
export function getUserRepository(): UserRepository {
  if (cached) return cached;
  cached = isSupabaseConfigured()
    ? new SupabaseUserRepository()
    : new LocalUserRepository();
  return cached;
}
