// Postgres password-reset-token repository — backs `password_reset_tokens`.

import type {
  NewPasswordResetToken,
  PasswordResetRepository,
  PasswordResetTokenRecord,
} from "../password-reset-repository";
import { isDbConfigured, queryOne, execute } from "@/lib/db/server";

export { isDbConfigured };

interface Row {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
}

export class PgPasswordResetRepository implements PasswordResetRepository {
  async create(token: NewPasswordResetToken): Promise<void> {
    await execute(
      `INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [token.userId, token.tokenHash, token.expiresAt],
    );
  }

  async findValid(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const row = await queryOne<Row>(
      `SELECT id, user_id, token_hash, expires_at, used_at
       FROM public.password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );
    if (!row) return null;
    if (row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;

    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
    };
  }

  async markUsed(tokenHash: string): Promise<void> {
    await execute(
      `UPDATE public.password_reset_tokens SET used_at = now() WHERE token_hash = $1`,
      [tokenHash],
    );
  }
}
