// Postgres user repository — direct SQL via pg Pool.
//
// Satisfies the `UserRepository` interface so the auth layer never knows which
// backend is active. Activated when DATABASE_URL is set.

import type { UserRecord } from "@/types/auth";
import type { NewUser, UserRepository } from "../repository";
import { isDbConfigured, query, queryOne } from "@/lib/db/server";

export { isDbConfigured as isSupabaseConfigured, isDbConfigured };

export class PgUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await queryOne<UserRecord>(
      `SELECT * FROM public.users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );
    return row;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await queryOne<UserRecord>(
      `SELECT * FROM public.users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return row;
  }

  async create(input: NewUser): Promise<UserRecord> {
    const row = await queryOne<UserRecord>(
      `INSERT INTO public.users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.email.toLowerCase(), input.name, input.passwordHash],
    );
    if (!row) throw new Error("[db] create user: no row returned");
    return row;
  }

  async update(
    id: string,
    updates: Partial<{
      name: string;
      username: string;
      bio: string;
      avatar_color: string;
      large_text: boolean;
      reduce_motion: boolean;
    }>,
  ): Promise<UserRecord> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      fields.push(`${key} = $${i++}`);
      values.push(value);
    }
    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("[db] update user: not found");
      return existing;
    }
    values.push(id);
    const row = await queryOne<UserRecord>(
      `UPDATE public.users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (!row) throw new Error("[db] update user: not found");
    return row;
  }

  async addXp(
    id: string,
    amount: number,
  ): Promise<{ xp: number; level: number }> {
    const rows = await query<{ xp: number; level: number }>(
      `SELECT xp, level FROM public.increment_user_xp($1::uuid, $2::int)`,
      [id, amount],
    );
    if (!rows.length) throw new Error("[db] addXp: no result returned");
    return { xp: rows[0].xp, level: rows[0].level };
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE public.users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id],
    );
  }
}

/** @deprecated Use PgUserRepository */
export const SupabaseUserRepository = PgUserRepository;
