// GET  /api/admin/users/[id]/rewards — a player's tickets, streak, badges and history (admin).
// POST /api/admin/users/[id]/rewards — add or remove tickets by hand (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, getSuperAdminUser } from "@/lib/auth/admin";
import { getUserRepository } from "@/lib/auth/repository";
import { recordAudit } from "@/lib/data/audit-repository";
import {
  InsufficientTicketsError,
  adjustTickets,
  getRewardsOverview,
} from "@/lib/rewards/service";

export const dynamic = "force-dynamic";

const adjustSchema = z.object({
  delta: z
    .number()
    .int("Tickets must be a whole number")
    .refine((n) => n !== 0, "Enter a non-zero amount")
    .refine((n) => Math.abs(n) <= 1000, "At most 1,000 tickets per adjustment"),
  reason: z.string().trim().min(3, "Give a reason").max(200),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    return NextResponse.json(await getRewardsOverview(id));
  } catch (err) {
    console.error("[api] GET /api/admin/users/[id]/rewards:", err);
    return NextResponse.json({ error: "Failed to load rewards." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSuperAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't adjust your own tickets." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const target = await getUserRepository().findById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  try {
    const balance = await adjustTickets(id, parsed.data.delta);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "user.tickets_adjusted",
      entityType: "user",
      entityId: id,
      details: {
        email: target.email,
        delta: parsed.data.delta,
        reason: parsed.data.reason,
        balance,
      },
    });
    return NextResponse.json({ balance });
  } catch (err) {
    if (err instanceof InsufficientTicketsError) {
      return NextResponse.json(
        { error: `This player only has ${err.balance} tickets.` },
        { status: 409 },
      );
    }
    console.error("[api] POST /api/admin/users/[id]/rewards:", err);
    return NextResponse.json({ error: "Failed to adjust tickets." }, { status: 500 });
  }
}
