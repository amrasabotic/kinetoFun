// PUT    /api/admin/games/[id] — update a game (admin only).
// DELETE /api/admin/games/[id] — delete a game + cascade (admin only).

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { updateGame, deleteGame } from "@/lib/data/games-repository";
import { gameSchema, toGameInput } from "@/lib/data/game-schema";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = gameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const game = await updateGame(id, toGameInput(parsed.data));
    const action =
      game.status === "published"
        ? "game.published"
        : game.status === "archived"
          ? "game.archived"
          : "game.updated";
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action,
      entityType: "game",
      entityId: game.id,
      details: { title: game.title, status: game.status },
    });
    return NextResponse.json({ game });
  } catch (err) {
    console.error("[api] PUT /api/admin/games/[id]:", err);
    return NextResponse.json({ error: "Failed to update game." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteGame(id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "game.deleted",
      entityType: "game",
      entityId: id,
      details: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/games/[id]:", err);
    return NextResponse.json({ error: "Failed to delete game." }, { status: 500 });
  }
}
