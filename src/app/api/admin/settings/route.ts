// GET  /api/admin/settings — read full platform settings (superadmin only).
// PATCH /api/admin/settings — update one or more settings fields (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import { getSettings, updateSettings } from "@/lib/data/settings-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json({ settings: await getSettings() });
  } catch (err) {
    console.error("[api] GET /api/admin/settings:", err);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

const patchSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().min(1).max(500).optional(),
  announcementActive: z.boolean().optional(),
  announcementText: z.string().max(500).optional(),
  announcementType: z.enum(["info", "warning", "success"]).optional(),
  registrationOpen: z.boolean().optional(),
  featuredSectionTitle: z.string().min(1).max(100).optional(),
  maxLeaderboardEntries: z.number().int().min(1).max(100).optional(),
  defaultDifficultyFilter: z.enum(["all", "easy", "medium", "hard"]).optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const settings = await updateSettings(parsed.data, admin.id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "settings.updated",
      entityType: "game", // closest existing type; no DB constraint
      entityId: "platform",
      details: { changes: parsed.data },
    });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[api] PATCH /api/admin/settings:", err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
