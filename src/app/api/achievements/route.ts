// POST /api/achievements  { gameId: string, achievementIds: string[] }
// Records in-game achievements the player has unlocked. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { syncGameAchievements } from "@/lib/rewards/service";

export const dynamic = "force-dynamic";

const syncSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  // Larger than any game's catalogue; ids outside the catalogue are ignored.
  achievementIds: z.array(z.string().min(1).max(100)).max(100),
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

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const result = await syncGameAchievements({ userId: user.id, ...parsed.data });
    if (!result) {
      return NextResponse.json({ error: "Play this game first." }, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api] POST /api/achievements:", err);
    return NextResponse.json({ error: "Failed to save achievements." }, { status: 500 });
  }
}
