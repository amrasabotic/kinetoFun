// POST /api/auth/logout-all — revoke every session for the current user
// ("sign out everywhere") and clear this device's cookie.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { destroyAllSessions } from "@/lib/auth/session";
import type { AuthError } from "@/types/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." } satisfies AuthError,
      { status: 401 },
    );
  }

  await destroyAllSessions(user.id);
  return NextResponse.json({ ok: true });
}
