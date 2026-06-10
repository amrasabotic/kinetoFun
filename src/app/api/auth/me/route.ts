// GET /api/auth/me — validate the session token and return the current user.
// This is the secure check (verifies the JWT AND loads the user from the DB),
// and powers the frontend's auto session-restore on refresh.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import type { AuthError, AuthSuccess } from "@/types/auth";

// Always evaluated at request time (reads the session cookie); never cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." } satisfies AuthError,
      { status: 401 },
    );
  }

  return NextResponse.json({ user } satisfies AuthSuccess);
}
