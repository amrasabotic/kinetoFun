// GET /api/admin/audit-logs — paged audit trail + summary (admin only).
// Query: ?entityType=&adminId=&from=&to=&search=&page=&limit=

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
  const limit = sp.get("limit") ? Math.min(Number(sp.get("limit")), 200) : 50;
  const pageNum = sp.get("page") ? Math.max(1, Number(sp.get("page"))) : 1;
  const offset = (pageNum - 1) * limit;

  const validEntity =
    entityType === "category" || entityType === "game" || entityType === "user"
      ? entityType
      : undefined;

  try {
    const [result, summary] = await Promise.all([
      listAuditLogs({ entityType: validEntity, adminId, from, to, search, limit, offset }),
      getAuditSummary(),
    ]);
    const totalPages = Math.max(1, Math.ceil(result.total / limit));
    return NextResponse.json({ ...result, page: pageNum, totalPages, summary });
  } catch (err) {
    console.error("[api] GET /api/admin/audit-logs:", err);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
