// PATCH /api/admin/games/[id]/tv-ready  { tvReady: boolean } → { game }
// Shows or hides a game on the TV (admin).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { setGameTvReady } from "@/lib/data/games-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { isUndefinedColumn } from "@/lib/db/server";

export const dynamic = "force-dynamic";

const schema = z.object({ tvReady: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "tvReady must be true or false." }, { status: 422 });
  }

  const { id } = await params;
  try {
    const game = await setGameTvReady(id, parsed.data.tvReady);
    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "game.tv_ready_updated",
      entityType: "game",
      entityId: id,
      details: { title: game.title, tvReady: parsed.data.tvReady },
    });
    return NextResponse.json({ game });
  } catch (err) {
    if (isUndefinedColumn(err)) {
      return NextResponse.json(
        { error: "TV games need database migration 0018 first." },
        { status: 409 },
      );
    }
    console.error("[api] PATCH /api/admin/games/[id]/tv-ready:", err);
    return NextResponse.json({ error: "Failed to update the game." }, { status: 500 });
  }
}
