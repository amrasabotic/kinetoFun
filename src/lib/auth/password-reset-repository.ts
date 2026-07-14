// Password-reset-token persistence boundary.
//
// Only a SHA-256 hash of the token is ever stored or looked up here — the raw
// token exists only in the emailed link and briefly in the request handler.

import {
  PgPasswordResetRepository,
  isDbConfigured,
} from "./repositories/pg-password-reset-repository";
import { LocalPasswordResetRepository } from "./repositories/local-password-reset-repository";

/** A persisted reset token, as needed for the validity check. */
export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string; // ISO
  usedAt: string | null;
}

export interface NewPasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: string; // ISO
}

export interface PasswordResetRepository {
  create(token: NewPasswordResetToken): Promise<void>;
  /** Returns the token row if it exists, is unused, and has not expired. */
  findValid(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(tokenHash: string): Promise<void>;
}

let cached: PasswordResetRepository | null = null;

/** Get the active password-reset-token repository (memoized). */
export function getPasswordResetRepository(): PasswordResetRepository {
  if (cached) return cached;
  cached = isDbConfigured()
    ? new PgPasswordResetRepository()
    : new LocalPasswordResetRepository();
  return cached;
}
