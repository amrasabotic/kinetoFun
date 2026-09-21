// GET /api/admin/analytics — platform stats (admin only).

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getAnalytics } from "@/lib/data/admin-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(await getAnalytics());
  } catch (err) {
    console.error("[api] GET /api/admin/analytics:", err);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
