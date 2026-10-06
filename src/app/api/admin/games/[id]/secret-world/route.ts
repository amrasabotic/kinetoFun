// PATCH /api/admin/games/[id]/secret-world  { unlockCost: number | null } → { game }
// Sets or clears a game's secret-world ticket price (admin).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { setGameUnlockCost } from "@/lib/data/games-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { isUndefinedColumn } from "@/lib/db/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  unlockCost: z
    .number()
    .int("Price must be a whole number")
    .min(1, "Price must be at least 1 ticket")
    .max(5000, "Price can be at most 5,000 tickets")
    .nullable(),
});

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { id } = await params;
  try {
    const game = await setGameUnlockCost(id, parsed.data.unlockCost);
    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "game.secret_world_updated",
      entityType: "game",
      entityId: id,
      details: { title: game.title, unlockCost: parsed.data.unlockCost },
    });
    return NextResponse.json({ game });
  } catch (err) {
    if (isUndefinedColumn(err)) {
      return NextResponse.json(
        { error: "Secret worlds need database migration 0017 first." },
        { status: 409 },
      );
    }
    console.error("[api] PATCH /api/admin/games/[id]/secret-world:", err);
    return NextResponse.json({ error: "Failed to update the game." }, { status: 500 });
  }
}
