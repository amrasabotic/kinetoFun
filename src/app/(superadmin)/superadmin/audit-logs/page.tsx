"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollText,
  CalendarClock,
  CalendarDays,
  Calendar,
  Inbox,
  X,
  FolderTree,
  Gamepad2,
  Users as UsersIcon,
} from "lucide-react";
import type { AuditLog } from "@/types";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  InitialsAvatar,
  TableSkeleton,
  SearchInput,
  Select,
  Pagination,
} from "@/components/superadmin/ui";
import { auditMeta } from "@/components/superadmin/audit";

const PAGE_SIZE = 50;

interface Summary {
  today: number;
  week: number;
  month: number;
  total: number;
}
interface AdminOption {
  id: string;
  name: string;
}

type EntityFilter = "all" | "category" | "game" | "user";
type DateFilter = "all" | "today" | "7d" | "30d";

const ENTITY_ICON: Record<string, React.ReactNode> = {
  category: <FolderTree className="h-3.5 w-3.5" />,
  game: <Gamepad2 className="h-3.5 w-3.5" />,
  user: <UsersIcon className="h-3.5 w-3.5" />,
};

const TINT_BG: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-500",
};

function fromForDate(filter: DateFilter): string | undefined {
  const now = Date.now();
  if (filter === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (filter === "7d") return new Date(now - 7 * 86400000).toISOString();
  if (filter === "30d") return new Date(now - 30 * 86400000).toISOString();
  return undefined;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [adminId, setAdminId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to page 1 whenever any filter changes.
  useEffect(() => {
    setPage(1);
  }, [entity, adminId, debounced, dateFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entity !== "all") params.set("entityType", entity);
      if (adminId !== "all") params.set("adminId", adminId);
      if (debounced) params.set("search", debounced);
      const from = fromForDate(dateFilter);
      if (from) params.set("from", from);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs.");
      const json = await res.json();
      setLogs(json.logs as AuditLog[]);
      setSummary(json.summary as Summary);
      setTotal(json.total as number);
      setTotalPages(json.totalPages as number);
      // Keep the admin filter options stable (only grow the known set).
      setAdmins((prev) => {
        const map = new Map(prev.map((a) => [a.id, a.name]));
        for (const a of (json.admins ?? []) as AdminOption[]) map.set(a.id, a.name);
        return Array.from(map, ([id, name]) => ({ id, name }));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [entity, adminId, debounced, dateFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtersActive = entity !== "all" || adminId !== "all" || dateFilter !== "all" || !!debounced;

  const adminOptions = useMemo(
    () => [
      { value: "all", label: "All admins" },
      ...admins.map((a) => ({ value: a.id, label: a.name })),
    ],
    [admins],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Audit Logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          A complete trail of every action taken in the admin console.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="mt-4 h-7 w-16 animate-pulse rounded bg-slate-200/70" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-200/70" />
            </Card>
          ))
        ) : (
          <>
            <StatCard tint="violet" icon={<CalendarClock className="h-5 w-5" />} value={summary.today} label="Actions Today" />
            <StatCard tint="sky" icon={<CalendarDays className="h-5 w-5" />} value={summary.week} label="This Week" />
            <StatCard tint="emerald" icon={<Calendar className="h-5 w-5" />} value={summary.month} label="This Month" />
            <StatCard tint="amber" icon={<ScrollText className="h-5 w-5" />} value={summary.total} label="Total Logs" />
          </>
        )}
      </div>

      <Card>
        {/* Toolbar */}
        <div className="space-y-3 border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by admin, action, or entity…" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Entity"
              value={entity}
              onChange={(v) => setEntity(v as EntityFilter)}
              options={[
                { value: "all", label: "All entities" },
                { value: "category", label: "Categories" },
                { value: "game", label: "Games" },
                { value: "user", label: "Users" },
              ]}
            />
            <Select aria-label="Admin" value={adminId} onChange={setAdminId} options={adminOptions} />
            <Select
              aria-label="Date range"
              value={dateFilter}
              onChange={(v) => setDateFilter(v as DateFilter)}
              options={[
                { value: "all", label: "All time" },
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
              ]}
            />
            {filtersActive && (
              <button
                onClick={() => {
                  setQuery("");
                  setEntity("all");
                  setAdminId("all");
                  setDateFilter("all");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title={filtersActive ? "No matching activity" : "No audit activity"}
            description={
              filtersActive
                ? "Try adjusting your filters or date range."
                : "Admin actions like creating categories or publishing games will be recorded here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Admin</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">When</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = auditMeta(log.action);
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TINT_BG[meta.tint])}>
                            {meta.icon}
                          </span>
                          <span className="font-medium text-slate-800">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar name={log.adminName} size="sm" />
                          <span className="truncate text-slate-600">{log.adminName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="slate">
                          {ENTITY_ICON[log.entityType]}
                          <span className="capitalize">{log.entityType}</span>
                        </Badge>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">
                        {relativeTime(log.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-medium text-violet-600">Details</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        )}
      </Card>

      {selected && <LogDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function LogDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const meta = auditMeta(log.action);
  const detailEntries = Object.entries(log.details ?? {});
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TINT_BG[meta.tint])}>
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900">{meta.label}</h2>
            <p className="font-mono text-xs text-slate-400">{log.action}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Admin">
              <span className="flex items-center gap-2">
                <InitialsAvatar name={log.adminName} size="sm" />
                {log.adminName}
              </span>
            </DetailRow>
            <DetailRow label="Entity">
              <Badge tone="slate">
                {ENTITY_ICON[log.entityType]}
                <span className="capitalize">{log.entityType}</span>
              </Badge>
            </DetailRow>
            <DetailRow label="Entity ID">
              <span className="break-all font-mono text-xs text-slate-600">{log.entityId ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Timestamp">
              <span className="text-slate-600">{new Date(log.createdAt).toLocaleString()}</span>
            </DetailRow>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
            {detailEntries.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-400">No additional details.</p>
            ) : (
              <pre className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}
