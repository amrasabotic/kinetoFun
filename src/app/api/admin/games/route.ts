// GET  /api/admin/games — list all games (admin only).
// POST /api/admin/games — create a game (admin only).

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { listAllGames, createGame } from "@/lib/data/games-repository";
import { gameSchema, toGameInput } from "@/lib/data/game-schema";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Admin sees every game (draft/archived included).
    return NextResponse.json({ games: await listAllGames() });
  } catch (err) {
    console.error("[api] GET /api/admin/games:", err);
    return NextResponse.json({ error: "Failed to load games." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  const parsed = gameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const game = await createGame(toGameInput(parsed.data));
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "game.created",
      entityType: "game",
      entityId: game.id,
      details: { title: game.title, status: game.status, category: game.category },
    });
    return NextResponse.json({ game }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/admin/games:", err);
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "A game with that id already exists."
        : "Failed to create game.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
