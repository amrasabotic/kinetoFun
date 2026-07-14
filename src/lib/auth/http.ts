// Shared HTTP helpers for the auth route handlers.

import { NextResponse } from "next/server";
import type { AuthError } from "@/types/auth";

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." } satisfies AuthError,
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
