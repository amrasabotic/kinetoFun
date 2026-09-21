// PATCH  /api/admin/categories/[id] — update a category (admin only).
// DELETE /api/admin/categories/[id] — delete with game safeguards (admin only).
//
// DELETE requires an explicit strategy when the category still contains games
// (query `?strategy=move&target=<id>` reassigns them; `?strategy=delete-games`
// removes them too). With no games, a plain DELETE is allowed.

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
  countGamesInCategory,
  moveGames,
  deleteGamesInCategory,
} from "@/lib/data/categories-repository";
import { categoryUpdateSchema } from "@/lib/data/category-schema";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const patch = { ...parsed.data };
    if (patch.image === "") patch.image = undefined;
    const category = await updateCategory(id, patch);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action:
        parsed.data.isActive !== undefined && Object.keys(parsed.data).length === 1
          ? parsed.data.isActive
            ? "category.enabled"
            : "category.disabled"
          : "category.updated",
      entityType: "category",
      entityId: category.id,
      details: { name: category.name, changes: Object.keys(parsed.data) },
    });
    return NextResponse.json({ category });
  } catch (err) {
    console.error("[api] PATCH /api/admin/categories/[id]:", err);
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "A category with that slug already exists."
        : "Failed to update category.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const url = new URL(request.url);
  const strategy = url.searchParams.get("strategy"); // 'move' | 'delete-games' | null
  const target = url.searchParams.get("target"); // category id when strategy=move

  try {
    const category = await getCategoryById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const gamesCount = await countGamesInCategory(id);

    if (gamesCount > 0) {
      if (strategy === "move") {
        if (!target || target === id) {
          return NextResponse.json(
            { error: "Choose a different target category to move games into." },
            { status: 400 },
          );
        }
        await moveGames(id, target);
      } else if (strategy === "delete-games") {
        await deleteGamesInCategory(id);
      } else {
        // Safeguard: refuse to silently orphan/destroy games.
        return NextResponse.json(
          {
            error: "category_has_games",
            gamesCount,
            message: `This category contains ${gamesCount} game(s). Choose how to proceed.`,
          },
          { status: 409 },
        );
      }
    }

    await deleteCategory(id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "category.deleted",
      entityType: "category",
      entityId: id,
      details: {
        name: category.name,
        gamesCount,
        strategy: gamesCount > 0 ? strategy : "none",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/categories/[id]:", err);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
