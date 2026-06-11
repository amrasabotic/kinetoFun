// PATCH  /api/admin/users/[id] — change a user's role (superadmin only).
// DELETE /api/admin/users/[id] — delete a user + cascade (superadmin only).

import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminUser } from "@/lib/auth/admin";
import { updateUserRole, deleteUser } from "@/lib/data/admin-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(["user", "admin", "superadmin"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSuperAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Guard against self-demotion locking out the (possibly only) superadmin.
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't change your own role." },
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
    const user = await updateUserRole(id, parsed.data.role);
    return NextResponse.json({ user });
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] DELETE /api/admin/users/[id]:", err);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
