// GET /api/favorites → { gameIds: string[] }. Requires auth.
// POST /api/favorites { gameId: string } → { ok: true }. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { addFavorite, listFavoriteGameIds } from "@/lib/data/favorites-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameIds = await listFavoriteGameIds(user.id);
  return NextResponse.json({ gameIds });
}

const addSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    await addFavorite(user.id, parsed.data.gameId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/favorites:", err);
    return NextResponse.json({ error: "Failed to add favorite." }, { status: 500 });
  }
}
