// GET /api/profile/stats
// Returns the current user's profile stats (scores + sessions). Requires auth.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getUserStats } from "@/lib/data/scores-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getUserStats(user.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[api] GET /api/profile/stats:", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
