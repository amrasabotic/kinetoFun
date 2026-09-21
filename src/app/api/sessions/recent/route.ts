// GET /api/sessions/recent  → { gameIds: string[] }
// Most-recently-played distinct game IDs for the current user.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { listRecentGameIds } from "@/lib/data/sessions-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gameIds = await listRecentGameIds(user.id, 6);
    return NextResponse.json({ gameIds });
  } catch (err) {
    console.error("[api] GET /api/sessions/recent:", err);
    return NextResponse.json({ error: "Failed to load recent sessions." }, { status: 500 });
  }
}
