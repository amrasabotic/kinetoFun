// GET /api/admin/games/[id]/analytics?days=30 — per-game analytics (admin only).

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getGameAnalytics } from "@/lib/data/admin-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const days = Math.min(
    Number(request.nextUrl.searchParams.get("days") ?? "30"),
    90,
  );

  try {
    return NextResponse.json(await getGameAnalytics(id, days));
  } catch (err) {
    console.error("[api] GET /api/admin/games/[id]/analytics:", err);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
