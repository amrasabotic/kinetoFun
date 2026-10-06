// GET /api/shop → ShopOverview (balance, owned and equipped items, mystery box odds, secret worlds).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getShopOverview } from "@/lib/rewards/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getShopOverview(user.id));
  } catch (err) {
    console.error("[api] GET /api/shop:", err);
    return NextResponse.json({ error: "The shop is unavailable right now." }, { status: 500 });
  }
}
