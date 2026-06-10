// Supabase (PostgreSQL) user repository — uses the official Supabase client.
//
// Talks to Supabase as a *database only* (no Supabase Auth). It satisfies the
// `UserRepository` interface, so the auth layer never knows or cares which
// backend is active. Activated automatically when Supabase env vars are set.

import type { UserRecord } from "@/types/auth";
import type { NewUser, UserRepository } from "../repository";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

// Re-exported so the repository selector can stay decoupled from the client.
export { isSupabaseConfigured };

const TABLE = "users";

export class SupabaseUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("*")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[supabase] findByEmail: ${error.message}`);
    return (data as UserRecord | null) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[supabase] findById: ${error.message}`);
    return (data as UserRecord | null) ?? null;
  }

  async create(input: NewUser): Promise<UserRecord> {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .insert({
        email: input.email.toLowerCase(),
        name: input.name,
        password_hash: input.passwordHash,
      })
      .select("*")
      .single();
    if (error) throw new Error(`[supabase] create: ${error.message}`);
    return data as UserRecord;
  }
}
