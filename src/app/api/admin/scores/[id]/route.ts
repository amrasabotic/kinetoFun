// DELETE /api/admin/scores/[id] — delete a single score entry (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import { deleteScore } from "@/lib/data/admin-repository";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const gameId = request.nextUrl.searchParams.get("gameId") ?? undefined;

  try {
    await deleteScore(id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "leaderboard.score_deleted",
      entityType: "score",
      entityId: gameId ?? id,
      details: { scoreId: id, gameId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/scores/[id]:", err);
    return NextResponse.json({ error: "Failed to delete score." }, { status: 500 });
  }
}
