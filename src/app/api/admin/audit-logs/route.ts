// GET /api/admin/audit-logs — paged audit trail + summary (admin only).
// Query: ?entityType=&adminId=&from=&to=&search=&limit=

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { listAuditLogs, getAuditSummary } from "@/lib/data/audit-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const entityType = sp.get("entityType");
  const adminId = sp.get("adminId") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const search = sp.get("search")?.trim() || undefined;
  const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;

  const validEntity =
    entityType === "category" || entityType === "game" || entityType === "user"
      ? entityType
      : undefined;

  try {
    const [page, summary] = await Promise.all([
      listAuditLogs({ entityType: validEntity, adminId, from, to, search, limit }),
      getAuditSummary(),
    ]);
    return NextResponse.json({ ...page, summary });
  } catch (err) {
    console.error("[api] GET /api/admin/audit-logs:", err);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
