// POST /api/admin/categories/reorder — persist a new category ordering.
// Body: { order: string[] } — category ids in the desired display order.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { reorderCategories } from "@/lib/data/categories-repository";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

const schema = z.object({ order: z.array(z.string().uuid()).min(1) });

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 422 });
  }

  try {
    await reorderCategories(parsed.data.order);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "category.reordered",
      entityType: "category",
      entityId: null,
      details: { count: parsed.data.order.length },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] POST /api/admin/categories/reorder:", err);
    return NextResponse.json({ error: "Failed to reorder categories." }, { status: 500 });
  }
}
