// GET  /api/admin/scores?gameId=&page=&limit=    — paginated leaderboard (superadmin)
// GET  /api/admin/scores?gameId=&userId=         — score drawer entries (superadmin)
// DELETE /api/admin/scores?gameId=&all=true      — reset game leaderboard (superadmin)

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import {
  getAdminLeaderboard,
  getScoresByUserGame,
  deleteAllScoresForGame,
} from "@/lib/data/admin-repository";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const gameId = sp.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 });

  const userId = sp.get("userId");

  try {
    // Score drawer: entries for one user in one game
    if (userId) {
      const scores = await getScoresByUserGame(gameId, userId);
      return NextResponse.json({ scores });
    }

    // Paginated leaderboard
    const page = Math.max(1, Number(sp.get("page") ?? "1"));
    const limit = Math.min(Number(sp.get("limit") ?? "20"), 100);
    return NextResponse.json(await getAdminLeaderboard(gameId, page, limit));
  } catch (err) {
    console.error("[api] GET /api/admin/scores:", err);
    return NextResponse.json({ error: "Failed to load leaderboard." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const gameId = sp.get("gameId");
  const all = sp.get("all");

  if (!gameId || all !== "true") {
    return NextResponse.json({ error: "gameId and all=true are required" }, { status: 400 });
  }

  try {
    await deleteAllScoresForGame(gameId);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "leaderboard.reset",
      entityType: "score",
      entityId: gameId,
      details: { gameId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/scores:", err);
    return NextResponse.json({ error: "Failed to reset leaderboard." }, { status: 500 });
  }
}
