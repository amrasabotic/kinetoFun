// GET /api/leaderboard?gameId=<slug>&limit=10
// Omit gameId for the global board.

import { type NextRequest, NextResponse } from "next/server";
import {
  listLeaderboardForGame,
  listGlobalLeaderboard,
} from "@/lib/data/scores-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId") ?? null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  try {
    const entries = gameId
      ? await listLeaderboardForGame(gameId, limit)
      : await listGlobalLeaderboard(limit);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[api] GET /api/leaderboard:", err);
    return NextResponse.json({ error: "Failed to load leaderboard." }, { status: 500 });
  }
}
