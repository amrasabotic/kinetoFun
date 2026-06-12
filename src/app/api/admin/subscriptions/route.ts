// GET  /api/admin/subscriptions — list all subscriptions with summary (superadmin only).
// POST /api/admin/subscriptions — grant pro to a user (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import {
  listAllSubscriptions,
  getSubscriptionSummary,
  grantProSubscription,
} from "@/lib/data/subscriptions-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [subscriptions, summary] = await Promise.all([
      listAllSubscriptions(),
      getSubscriptionSummary(),
    ]);
    return NextResponse.json({ subscriptions, summary });
  } catch (err) {
    console.error("[api] GET /api/admin/subscriptions:", err);
    return NextResponse.json({ error: "Failed to load subscriptions." }, { status: 500 });
  }
}

const grantSchema = z.object({ userId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const subscription = await grantProSubscription(parsed.data.userId);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "subscription.granted",
      entityType: "subscription",
      entityId: parsed.data.userId,
      details: { userId: parsed.data.userId, userName: subscription.userName },
    });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/admin/subscriptions:", err);
    return NextResponse.json({ error: "Failed to grant subscription." }, { status: 500 });
  }
}
