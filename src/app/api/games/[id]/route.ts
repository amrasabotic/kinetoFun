// GET /api/games/[id] — a single game by id (read from Supabase).

import { NextResponse } from "next/server";
import { getGameById } from "@/lib/data/games-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }
    return NextResponse.json({ game });
  } catch (err) {
    console.error("[api] GET /api/games/[id]:", err);
    return NextResponse.json({ error: "Failed to load game." }, { status: 500 });
  }
}
