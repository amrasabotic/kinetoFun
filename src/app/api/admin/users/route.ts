// GET /api/admin/users — list all users (admin only).

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { listAllUsers } from "@/lib/data/admin-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json({ users: await listAllUsers() });
  } catch (err) {
    console.error("[api] GET /api/admin/users:", err);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}
