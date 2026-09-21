// Postgres session repository — backs revocable sessions with `auth_sessions`.

import type {
  NewSession,
  SessionRecord,
  SessionRepository,
} from "../session-repository";
import { isDbConfigured, queryOne, execute } from "@/lib/db/server";

export { isDbConfigured as isSupabaseConfigured, isDbConfigured };

interface Row {
  id: string;
  user_id: string;
  expires_at: string | null;
}

export class PgSessionRepository implements SessionRepository {
  async create(session: NewSession): Promise<void> {
    await execute(
      `INSERT INTO public.auth_sessions (id, user_id, user_agent, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        session.id,
        session.userId,
        session.userAgent,
        session.ip,
        session.expiresAt,
      ],
    );
  }

  async findValid(id: string): Promise<SessionRecord | null> {
    const row = await queryOne<Row>(
      `SELECT id, user_id, expires_at FROM public.auth_sessions WHERE id = $1`,
      [id],
    );
    if (!row) return null;

    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      await this.delete(id).catch(() => {});
      return null;
    }
    return {
      id: row.id,
      userId: row.user_id,
      expiresAt: row.expires_at ?? "",
    };
  }

  async delete(id: string): Promise<void> {
    await execute(`DELETE FROM public.auth_sessions WHERE id = $1`, [id]);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await execute(`DELETE FROM public.auth_sessions WHERE user_id = $1`, [
      userId,
    ]);
  }
}

/** @deprecated Use PgSessionRepository */
export const SupabaseSessionRepository = PgSessionRepository;
