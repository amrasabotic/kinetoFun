// GET /api/rewards → RewardsOverview (ticket balance, streak, badges, history).
// Requires auth.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getRewardsOverview } from "@/lib/rewards/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getRewardsOverview(user.id));
  } catch (err) {
    console.error("[api] GET /api/rewards:", err);
    return NextResponse.json({ error: "Failed to load rewards." }, { status: 500 });
  }
}
