"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  ShieldCheck,
  UserPlus,
  Search,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Trash2,
  Pencil,
  UserX,
  UserCheck,
  Ticket,
} from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  Card,
  StatCard,
  Skeleton,
  Badge,
  EmptyState,
  InitialsAvatar,
  AdminButton,
  Pagination,
  TableSkeleton,
} from "@/components/superadmin/ui";
import { ActionMenu } from "@/components/superadmin/ActionMenu";
import { ConfirmDialog } from "@/components/superadmin/ConfirmDialog";
import { UserRewardsDialog } from "@/components/superadmin/UserRewardsDialog";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  level: number;
  xp: number;
  createdAt: string;
  active: boolean;
  /** null until the rewards migration is applied. */
  tickets: number | null;
}

type RoleFilter = "all" | "user" | "admin" | "superadmin";
type SortKey = "newest" | "oldest" | "name";
const PAGE_SIZE = 8;
const ROLES = ["user", "admin", "superadmin"] as const;

export default function UsersPage() {
  const { user: me } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const [manage, setManage] = useState<AdminUser | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [rewardsFor, setRewardsFor] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, fmt, serverText } = useI18n();
  const u_ = t.adminUsers;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users.");
      const json = await res.json();
      setUsers(json.users as AdminUser[]);
    } catch (err) {
      setError(serverText(err instanceof Error ? err.message : "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Reset to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, sort]);

  const summary = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
      newWeek: users.filter((u) => new Date(u.createdAt).getTime() > weekAgo).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      const matchesQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQ && matchesRole;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [users, query, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function saveRole(role: string) {
    if (!manage) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${manage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? u_.roleFailed);
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === manage.id ? { ...u, role: role as AdminUser["role"] } : u)),
      );
      setManage(null);
    } catch (err) {
      alert(err instanceof Error ? serverText(err.message) : u_.roleFailed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to delete user.");
      }
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      alert(serverText(err instanceof Error ? err.message : "Failed to delete user."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to update user.");
      }
      setUsers((prev) =>
        prev.map((usr) => (usr.id === u.id ? { ...usr, active: !u.active } : usr)),
      );
    } catch (err) {
      alert(serverText(err instanceof Error ? err.message : "Failed to update user."));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{u_.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{u_.subtitle}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard tint="violet" icon={<UsersIcon className="h-5 w-5" />} value={summary.total} label={t.adminDashboard.totalUsers} />
            <StatCard tint="sky" icon={<ShieldCheck className="h-5 w-5" />} value={summary.admins} label={u_.admins} />
            <StatCard tint="emerald" icon={<UserPlus className="h-5 w-5" />} value={summary.newWeek} label={u_.newWeek} />
          </>
        )}
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={u_.search}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as RoleFilter)}
              options={[
                { value: "all", label: u_.allRoles },
                { value: "user", label: u_.filterUsers },
                { value: "admin", label: u_.admins },
                { value: "superadmin", label: u_.superadmins },
              ]}
            />
            <Select
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={[
                { value: "newest", label: u_.newest },
                { value: "oldest", label: u_.oldest },
                { value: "name", label: u_.nameAz },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title={query || roleFilter !== "all" ? u_.noMatch : u_.none}
            description={
              query || roleFilter !== "all"
                ? u_.adjustFilters
                : u_.noneHint
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">{u_.colUser}</th>
                  <th className="px-5 py-3 font-semibold">{u_.colRole}</th>
                  <th className="px-5 py-3 font-semibold">{u_.colStatus}</th>
                  <th className="px-5 py-3 font-semibold">{u_.colTickets}</th>
                  <th className="px-5 py-3 font-semibold">{u_.colJoined}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={u.name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {u.name}
                              {isSelf && (
                                <span className="ml-2 text-[10px] font-medium text-slate-400">{t.leaderboard.table.you}</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={u.role === "superadmin" ? "violet" : u.role === "admin" ? "sky" : "slate"}
                        >
                          {u_.roles[u.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {u.active !== false ? (
                          <Badge tone="emerald">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {u_.active}
                          </Badge>
                        ) : (
                          <Badge tone="rose">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {u_.suspended}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-500">
                        {u.tickets === null ? "—" : fmt.number(u.tickets)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{fmt.date(u.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        {isSelf ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <ActionMenu
                            items={[
                              {
                                label: u_.rewards,
                                icon: <Ticket className="h-4 w-4" />,
                                onClick: () => setRewardsFor(u),
                              },
                              {
                                label: u_.editRole,
                                icon: <Pencil className="h-4 w-4" />,
                                onClick: () => setManage(u),
                              },
                              u.active !== false
                                ? {
                                    label: u_.suspend,
                                    icon: <UserX className="h-4 w-4" />,
                                    danger: true,
                                    onClick: () => toggleActive(u),
                                  }
                                : {
                                    label: u_.reactivate,
                                    icon: <UserCheck className="h-4 w-4" />,
                                    onClick: () => toggleActive(u),
                                  },
                              {
                                label: u_.delete,
                                icon: <Trash2 className="h-4 w-4" />,
                                danger: true,
                                onClick: () => setToDelete(u),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPage={setPage}
          />
        )}
      </Card>

      {/* Edit role dialog */}
      {manage && (
        <RoleDialog
          user={manage}
          busy={busy}
          onCancel={() => setManage(null)}
          onSave={saveRole}
        />
      )}

      {rewardsFor && (
        <UserRewardsDialog
          user={rewardsFor}
          canAdjust={me?.role === "superadmin"}
          onClose={() => setRewardsFor(null)}
          onAdjusted={(balance) =>
            setUsers((prev) =>
              prev.map((usr) => (usr.id === rewardsFor.id ? { ...usr, tickets: balance } : usr)),
            )
          }
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title={u_.deleteTitle}
        description={
          <>
            {u_.deleteBefore} <span className="font-semibold text-slate-700">{toDelete?.email}</span>{" "}
            {u_.deleteAfter}
          </>
        }
        confirmLabel={u_.delete}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function RoleDialog({
  user,
  busy,
  onCancel,
  onSave,
}: {
  user: AdminUser;
  busy: boolean;
  onCancel: () => void;
  onSave: (role: string) => void;
}) {
  const [role, setRole] = useState(user.role);
  const { t } = useI18n();
  const u_ = t.adminUsers;
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={user.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{user.name}</h2>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{u_.colRole}</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition",
                  role === r
                    ? "border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-violet-500/20"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {u_.roles[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onCancel} disabled={busy}>
            {t.common.actions.cancel}
          </AdminButton>
          <AdminButton onClick={() => onSave(role)} disabled={busy || role === user.role}>
            {busy ? t.common.actions.saving : u_.saveRole}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          icon ? "pl-8" : "pl-3",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
    </div>
  );
}

