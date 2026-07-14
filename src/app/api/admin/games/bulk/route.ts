// POST /api/admin/games/bulk — apply an action to many games (admin only).
// Body: { action: "publish" | "archive" | "draft" | "delete" | "category",
//         ids: string[], categoryId?, categoryName? }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import {
  bulkSetStatus,
  bulkDeleteGames,
  bulkSetCategory,
} from "@/lib/data/games-repository";
import { recordAudit } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["publish", "archive", "draft", "delete", "category"]),
  ids: z.array(z.string()).min(1, "Select at least one game."),
  categoryId: z.string().uuid().optional(),
  categoryName: z
    .enum(["Action", "Puzzle", "Sports", "Arcade", "Adventure", "Party"])
    .optional(),
});

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }
  const { action, ids, categoryId, categoryName } = parsed.data;

  try {
    let auditAction = `game.bulk_${action}`;
    switch (action) {
      case "publish":
        await bulkSetStatus(ids, "published");
        break;
      case "archive":
        await bulkSetStatus(ids, "archived");
        break;
      case "draft":
        await bulkSetStatus(ids, "draft");
        break;
      case "delete":
        await bulkDeleteGames(ids);
        break;
      case "category":
        if (!categoryId) {
          return NextResponse.json(
            { error: "categoryId is required to change category." },
            { status: 422 },
          );
        }
        await bulkSetCategory(ids, categoryId, categoryName);
        auditAction = "game.bulk_category";
        break;
    }

    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: auditAction,
      entityType: "game",
      entityId: null,
      details: { count: ids.length, ids, categoryId, categoryName },
    });

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error("[api] POST /api/admin/games/bulk:", err);
    return NextResponse.json({ error: "Bulk action failed." }, { status: 500 });
  }
}
