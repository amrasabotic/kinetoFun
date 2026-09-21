// GET /api/categories — public list of active categories (no auth required).

import { NextResponse } from "next/server";
import { listActiveCategories } from "@/lib/data/categories-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ categories: await listActiveCategories() });
  } catch (err) {
    console.error("[api] GET /api/categories:", err);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}
