// PATCH  /api/admin/users/[id] — change a user's role or active status (superadmin only).
// DELETE /api/admin/users/[id] — delete a user + cascade (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import { updateUserRole, setUserActive, deleteUser } from "@/lib/data/admin-repository";
import { recordAudit } from "@/lib/data/audit-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.union([
  z.object({ role: z.enum(["user", "admin", "superadmin"]) }),
  z.object({ active: z.boolean() }),
]);

export async function PATCH(
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
      { error: "You can't modify your own account here." },
      { status: 400 },
    );
  }

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
    if ("role" in parsed.data) {
      const user = await updateUserRole(id, parsed.data.role);
      void recordAudit({
        adminId: admin.id,
        adminName: admin.name,
        action: "user.role_updated",
        entityType: "user",
        entityId: user.id,
        details: { email: user.email, role: user.role },
      });
      return NextResponse.json({ user });
    } else {
      const user = await setUserActive(id, parsed.data.active);
      void recordAudit({
        adminId: admin.id,
        adminName: admin.name,
        action: parsed.data.active ? "user.reactivated" : "user.deactivated",
        entityType: "user",
        entityId: user.id,
        details: { email: user.email, active: user.active },
      });
      return NextResponse.json({ user });
    }
  } catch (err) {
    console.error("[api] PATCH /api/admin/users/[id]:", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSuperAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Don't let an admin delete their own account from here.
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't delete your own account here." },
      { status: 400 },
    );
  }

  try {
    await deleteUser(id);
    void recordAudit({
      adminId: admin.id,
      adminName: admin.name,
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      details: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/users/[id]:", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
