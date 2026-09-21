// TV pairing primitives — code/secret generation and expiry rules.
//
// Two separate secrets are involved, on purpose:
//
//   pairing_code  Short (6 chars), shown on the TV and embedded in the QR URL.
//                 It is a *public* rendezvous identifier, not a credential: it
//                 only lets an already-authenticated phone attach itself once.
//                 Safety comes from the 5-minute TTL, single-use pairing, and
//                 the rate limit on the join endpoint — not from its entropy.
//
//   tv secret     256 bits, returned exactly once when the TV creates the
//                 session, held only by the TV client. Required to read the
//                 paired user's name, to claim an auth session, and to end the
//                 pairing. Stored as a SHA-256 hash (same as password reset
//                 tokens), so a database read can't impersonate a TV.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** How long a `waiting` pairing session stays scannable. */
export const PAIRING_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Unambiguous uppercase alphabet — no 0/O, 1/I/L. The code is read off a TV
 * from across the room and typed on a phone, so lookalikes are a real cost.
 */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

/** Every state a pairing session can be in. Mirrors the DB check constraint. */
export type TvSessionStatus =
  | "waiting"
  | "authenticated"
  | "ready"
  | "ended"
  | "expired";

/** Statuses the client may also see, which are not rows in the table. */
export type TvSessionView = TvSessionStatus | "not_found";

/**
 * Cryptographically random pairing code. Uses rejection sampling so every
 * character is uniform over the alphabet (a plain `% 31` would bias the first
 * few letters).
 */
export function generatePairingCode(length = CODE_LENGTH): string {
  const max = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= max) continue; // reject, keeps the distribution flat
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** The TV's long-lived-for-this-session secret. Returned to the TV once. */
export function generateTvSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of a raw TV secret — the only form we persist. */
export function hashTvSecret(rawSecret: string): string {
  return createHash("sha256").update(rawSecret).digest("hex");
}

/**
 * Constant-time comparison of a presented secret against the stored hash.
 * Returns false for anything malformed rather than throwing.
 */
export function verifyTvSecret(
  rawSecret: string | null | undefined,
  storedHash: string | null | undefined,
): boolean {
  if (!rawSecret || !storedHash) return false;
  const presented = Buffer.from(hashTvSecret(rawSecret), "hex");
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, "hex");
  } catch {
    return false;
  }
  if (presented.length !== stored.length || stored.length === 0) return false;
  return timingSafeEqual(presented, stored);
}

/** Has the waiting window elapsed? */
export function isExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Timestamp a new pairing session should expire at. */
export function pairingExpiry(now = Date.now()): string {
  return new Date(now + PAIRING_TTL_MS).toISOString();
}

/** Normalize a code from a URL/QR scan (case-insensitive, trimmed). */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Cheap shape check before touching the database. */
export function isWellFormedCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((ch) => CODE_ALPHABET.includes(ch));
}
