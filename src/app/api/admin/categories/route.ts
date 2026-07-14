// GET  /api/admin/categories — list categories with game counts (admin only).
// POST /api/admin/categories — create a category (admin only).

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { listCategories, createCategory } from "@/lib/data/categories-repository";
import { categoryCreateSchema } from "@/lib/data/category-schema";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (err) {
    console.error("[api] GET /api/admin/categories:", err);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const category = await createCategory({
      ...parsed.data,
      image: parsed.data.image || undefined,
    });
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "category.created",
      entityType: "category",
      entityId: category.id,
      details: { name: category.name, slug: category.slug },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/admin/categories:", err);
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "A category with that slug already exists."
        : "Failed to create category.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
