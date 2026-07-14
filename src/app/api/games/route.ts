// GET /api/games — public games catalog (read from Supabase).

import { NextResponse } from "next/server";
import { listGames } from "@/lib/data/games-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ games: await listGames() });
  } catch (err) {
    console.error("[api] GET /api/games:", err);
    return NextResponse.json({ error: "Failed to load games." }, { status: 500 });
  }
}
