// Server-only audit-log data access (Supabase / Postgres).
//
// Records every SuperAdmin write (category/game/user create/update/delete/…) and
// reads them back for the audit page. `recordAudit` is intentionally best-effort:
// a logging failure must never break the action it is describing, so callers can
// `void recordAudit(...)` without awaiting and errors are swallowed (logged).

import type { AuditLog } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface AuditRow {
  id: string;
  admin_id: string | null;
  admin_name: string;
  action: string;
  entity_type: "category" | "game" | "user";
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
  entityType: "category" | "game" | "user";
  entityId?: string | null;
  details?: Record<string, unknown>;
}

/** Best-effort insert — never throws (failures are logged, not propagated). */
export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin().from("audit_logs").insert({
      admin_id: event.adminId,
      admin_name: event.adminName,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      details: event.details ?? {},
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (err) {
    console.error("[audit] insert threw:", err);
  }
}

export interface AuditQuery {
  entityType?: "category" | "game" | "user";
  adminId?: string;
  /** ISO timestamps for an inclusive lower / exclusive upper bound. */
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditPage {
  logs: AuditLog[];
  total: number;
  /** Distinct admins that appear in the log (for the admin filter). */
  admins: Array<{ id: string; name: string }>;
}

export async function listAuditLogs(query: AuditQuery = {}): Promise<AuditPage> {
  const db = getSupabaseAdmin();
  const limit = Math.min(query.limit ?? 50, 200);
  const offset = query.offset ?? 0;

  let q = db
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.entityType) q = q.eq("entity_type", query.entityType);
  if (query.adminId) q = q.eq("admin_id", query.adminId);
  if (query.from) q = q.gte("created_at", query.from);
  if (query.to) q = q.lt("created_at", query.to);
  if (query.search) {
    const s = `%${query.search}%`;
    q = q.or(`admin_name.ilike.${s},action.ilike.${s},entity_id.ilike.${s}`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(`[supabase] listAuditLogs: ${error.message}`);
  const logs = (data as AuditRow[]).map(toAuditLog);

  // Distinct admins across the current page — accumulated client-side across pages.
  const seen = new Map<string, string>();
  for (const l of logs) if (l.adminId) seen.set(l.adminId, l.adminName);
  const admins = Array.from(seen, ([id, name]) => ({ id, name }));

  return { logs, total: count ?? logs.length, admins };
}

export interface AuditSummary {
  today: number;
  week: number;
  month: number;
  total: number;
}

export async function getAuditSummary(): Promise<AuditSummary> {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [today, week, month, total] = await Promise.all([
    db.from("audit_logs").select("*", head).gte("created_at", dayAgo),
    db.from("audit_logs").select("*", head).gte("created_at", weekAgo),
    db.from("audit_logs").select("*", head).gte("created_at", monthAgo),
    db.from("audit_logs").select("*", head),
  ]);

  const err = today.error ?? week.error ?? month.error ?? total.error;
  if (err) throw new Error(`[supabase] getAuditSummary: ${err.message}`);

  return {
    today: today.count ?? 0,
    week: week.count ?? 0,
    month: month.count ?? 0,
    total: total.count ?? 0,
  };
}
