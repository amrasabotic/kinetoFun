// DELETE /api/favorites/[gameId] → removes a favorite. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { removeFavorite } from "@/lib/data/favorites-repository";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  try {
    await removeFavorite(user.id, gameId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/favorites/[gameId]:", err);
    return NextResponse.json({ error: "Failed to remove favorite." }, { status: 500 });
  }
}
