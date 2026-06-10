// PATCH /api/sessions/[id]  → ends the session (status=ended).
// Requires auth; only the owning user can end their session.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { endSession } from "@/lib/data/sessions-repository";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await endSession(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] PATCH /api/sessions/[id]:", err);
    return NextResponse.json({ error: "Failed to end session." }, { status: 500 });
  }
}
