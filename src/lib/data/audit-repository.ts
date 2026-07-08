// Server-only audit-log data access (Postgres via pg).
//
// `recordAudit` is intentionally best-effort: a logging failure must never
// break the action it is describing.

import type { AuditLog } from "@/types";
import { execute, query, queryCount } from "@/lib/db/server";

interface AuditRow {
  id: string;
  admin_id: string | null;
  admin_name: string;
  action: string;
  entity_type: "category" | "game" | "user" | "score" | "subscription";
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function toAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details ?? {},
    createdAt: row.created_at,
  };
}

export interface AuditEvent {
  adminId: string | null;
  adminName: string;
  action: string;
  entityType: "category" | "game" | "user" | "score" | "subscription";
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    await execute(
      `INSERT INTO public.audit_logs
         (admin_id, admin_name, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        event.adminId,
        event.adminName,
        event.action,
        event.entityType,
        event.entityId ?? null,
        JSON.stringify(event.details ?? {}),
      ],
    );
  } catch (err) {
    console.error("[audit] insert threw:", err);
  }
}

export interface AuditQuery {
  entityType?: "category" | "game" | "user" | "score" | "subscription";
  adminId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditPage {
  logs: AuditLog[];
  total: number;
  admins: Array<{ id: string; name: string }>;
}

export async function listAuditLogs(q: AuditQuery = {}): Promise<AuditPage> {
  const limit = Math.min(q.limit ?? 50, 200);
  const offset = q.offset ?? 0;

  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (q.entityType) {
    where.push(`entity_type = $${i++}`);
    params.push(q.entityType);
  }
  if (q.adminId) {
    where.push(`admin_id = $${i++}`);
    params.push(q.adminId);
  }
  if (q.from) {
    where.push(`created_at >= $${i++}`);
    params.push(q.from);
  }
  if (q.to) {
    where.push(`created_at < $${i++}`);
    params.push(q.to);
  }
  if (q.search) {
    const s = `%${q.search}%`;
    where.push(
      `(admin_name ILIKE $${i} OR action ILIKE $${i} OR entity_id ILIKE $${i})`,
    );
    params.push(s);
    i++;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countParams = [...params];
  const total = await queryCount(
    `SELECT COUNT(*)::int AS count FROM public.audit_logs ${whereSql}`,
    countParams,
  );

  params.push(limit, offset);
  const rows = await query<AuditRow>(
    `SELECT * FROM public.audit_logs
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params,
  );

  const logs = rows.map(toAuditLog);
  const seen = new Map<string, string>();
  for (const l of logs) if (l.adminId) seen.set(l.adminId, l.adminName);
  const admins = Array.from(seen, ([id, name]) => ({ id, name }));

  return { logs, total, admins };
}

export interface AuditSummary {
  today: number;
  week: number;
  month: number;
  total: number;
}

export async function getAuditSummary(): Promise<AuditSummary> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [today, week, month, total] = await Promise.all([
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.audit_logs WHERE created_at >= $1`,
      [dayAgo],
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.audit_logs WHERE created_at >= $1`,
      [weekAgo],
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.audit_logs WHERE created_at >= $1`,
      [monthAgo],
    ),
    queryCount(`SELECT COUNT(*)::int AS count FROM public.audit_logs`),
  ]);

  return { today, week, month, total };
}
