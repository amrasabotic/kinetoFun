// Shared request-side helpers for the /api/tv route handlers.

import { NextResponse } from "next/server";
import {
  isWellFormedCode,
  normalizeCode,
  verifyTvSecret,
  type TvSessionView,
} from "./pairing";
import { findByCode, expireIfStale, type TvSessionRow } from "@/lib/data/tv-repository";

/** Header the TV presents to prove it owns a pairing session. */
export const TV_SECRET_HEADER = "x-tv-secret";

/** Message the phone shows when a scanned code is no longer usable. */
export const EXPIRED_MESSAGE =
  "This TV connection has expired. Please scan the new QR code shown on the TV.";

export function readTvSecret(request: Request): string | null {
  return request.headers.get(TV_SECRET_HEADER);
}

/** Does this request carry the secret for this exact session? */
export function isTvRequest(request: Request, row: TvSessionRow): boolean {
  return verifyTvSecret(readTvSecret(request), row.secret_hash);
}

interface Loaded {
  row: TvSessionRow;
  /** Status after lazily retiring a timed-out `waiting` session. */
  status: Exclude<TvSessionView, "not_found">;
}

/**
 * Resolve a `[code]` route param to a session plus its effective status, or a
 * ready-to-return 404. Codes are matched case-insensitively so a QR read as
 * lowercase still works.
 */
export async function loadSessionByCode(
  rawCode: string,
): Promise<Loaded | { notFound: NextResponse }> {
  const code = normalizeCode(rawCode);

  // Reject malformed codes before touching the database — cheap, and it keeps
  // scanner noise out of the query log.
  if (!isWellFormedCode(code)) {
    return { notFound: notFoundResponse() };
  }

  const row = await findByCode(code);
  if (!row) return { notFound: notFoundResponse() };

  return { row, status: await expireIfStale(row) };
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ status: "not_found" as const }, { status: 404 });
}

/** A pairing session in one of these states can never be joined again. */
export function isTerminal(status: string): boolean {
  return status === "expired" || status === "ended";
}

/** Request metadata recorded against a minted auth session. */
export function sessionMeta(request: Request) {
  return {
    userAgent: request.headers.get("user-agent"),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
  };
}
