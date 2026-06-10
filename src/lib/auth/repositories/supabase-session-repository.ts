// Supabase (PostgreSQL) session repository — backs revocable sessions with the
// `auth_sessions` table. Database only (no Supabase Auth), via the service-role
// client. Activated automatically when Supabase env vars are set.

import type {
  NewSession,
  SessionRecord,
  SessionRepository,
} from "../session-repository";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

// Re-exported so the repository selector can stay decoupled from the client.
export { isSupabaseConfigured };

const TABLE = "auth_sessions";

interface Row {
  id: string;
  user_id: string;
  expires_at: string | null;
}

export class SupabaseSessionRepository implements SessionRepository {
  async create(session: NewSession): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from(TABLE)
      .insert({
        id: session.id,
        user_id: session.userId,
        user_agent: session.userAgent,
        ip: session.ip,
        expires_at: session.expiresAt,
      });
    if (error) throw new Error(`[supabase] session create: ${error.message}`);
  }

  async findValid(id: string): Promise<SessionRecord | null> {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("id, user_id, expires_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`[supabase] session findValid: ${error.message}`);
    if (!data) return null;

    const row = data as Row;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      // Expired — clean it up opportunistically and treat as invalid.
      await this.delete(id).catch(() => {});
      return null;
    }
    return { id: row.id, userId: row.user_id, expiresAt: row.expires_at ?? "" };
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseAdmin().from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`[supabase] session delete: ${error.message}`);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from(TABLE)
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(`[supabase] session deleteAllForUser: ${error.message}`);
  }
}
