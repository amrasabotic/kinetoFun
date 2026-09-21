// PATCH /api/admin/subscriptions/[id] — revoke a subscription (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import { revokeSubscription } from "@/lib/data/subscriptions-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ action: z.enum(["revoke"]) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

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

  try {
    const subscription = await revokeSubscription(id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "subscription.revoked",
      entityType: "subscription",
      entityId: subscription.userId,
      details: { userId: subscription.userId, userName: subscription.userName },
    });
    return NextResponse.json({ subscription });
  } catch (err) {
    console.error("[api] PATCH /api/admin/subscriptions/[id]:", err);
    return NextResponse.json({ error: "Failed to update subscription." }, { status: 500 });
  }
}
