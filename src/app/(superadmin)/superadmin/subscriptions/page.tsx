"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  BadgeCheck,
  Wrench,
  ShieldCheck,
  Search,
  ChevronRight,
  Trash2,
  BadgePlus,
} from "lucide-react";
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

interface AdminSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface SubscriptionSummary {
  totalPro: number;
  activeSubscriptions: number;
  manualGrants: number;
  providerManaged: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

const PAGE_SIZE = 10;

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [grantOpen, setGrantOpen] = useState(false);
  const [toRevoke, setToRevoke] = useState<AdminSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, fmt, serverText } = useI18n();
  const sb = t.adminSubscriptions;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [subRes, userRes] = await Promise.all([
        fetch("/api/admin/subscriptions"),
        fetch("/api/admin/users"),
      ]);
      if (!subRes.ok) throw new Error("Failed to load subscriptions.");
      const subJson = await subRes.json();
      setSubscriptions(subJson.subscriptions as AdminSubscription[]);
      setSummary(subJson.summary as SubscriptionSummary);
      if (userRes.ok) {
        const userJson = await userRes.json();
        setUsers((userJson.users as AdminUser[]) ?? []);
      }
    } catch (err) {
      setError(serverText(err instanceof Error ? err.message : "Failed to load subscriptions."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(1); }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter(
      (s) =>
        s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q),
    );
  }, [subscriptions, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function confirmRevoke() {
    if (!toRevoke) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${toRevoke.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? sb.revokeFailed);
      }
      const { subscription } = await res.json();
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === toRevoke.id ? subscription : s)),
      );
      if (summary) {
        setSummary({
          ...summary,
          activeSubscriptions: Math.max(0, summary.activeSubscriptions - 1),
        });
      }
      setToRevoke(null);
    } catch (err) {
      alert(err instanceof Error ? serverText(err.message) : sb.revokeFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleGrant(userId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to grant subscription.");
      }
      const { subscription } = await res.json();
      setSubscriptions((prev) => {
        const idx = prev.findIndex((s) => s.userId === userId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = subscription;
          return next;
        }
        return [subscription, ...prev];
      });
      if (summary) {
        setSummary({
          ...summary,
          totalPro: summary.totalPro + 1,
          activeSubscriptions: summary.activeSubscriptions + 1,
          manualGrants: summary.manualGrants + 1,
        });
      }
      setGrantOpen(false);
    } catch (err) {
      alert(serverText(err instanceof Error ? err.message : "Failed to grant subscription."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{sb.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{sb.subtitle}</p>
        </div>
        <AdminButton onClick={() => setGrantOpen(true)}>
          <BadgePlus className="h-4 w-4" />
          {sb.grant}
        </AdminButton>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard tint="violet" icon={<CreditCard className="h-5 w-5" />} value={summary?.totalPro ?? 0} label={sb.totalPro} />
            <StatCard tint="emerald" icon={<BadgeCheck className="h-5 w-5" />} value={summary?.activeSubscriptions ?? 0} label={sb.active} />
            <StatCard tint="sky" icon={<Wrench className="h-5 w-5" />} value={summary?.manualGrants ?? 0} label={sb.manual} />
            <StatCard tint="amber" icon={<ShieldCheck className="h-5 w-5" />} value={summary?.providerManaged ?? 0} label={sb.provider} />
          </>
        )}
      </div>

      {/* Table card */}
      <Card>
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.adminUsers.search}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-6 w-6" />}
            title={query ? sb.noMatch : sb.none}
            description={
              query
                ? sb.adjustSearch
                : sb.noneHint
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">{t.adminUsers.colUser}</th>
                  <th className="px-5 py-3 font-semibold">{sb.colPlan}</th>
                  <th className="px-5 py-3 font-semibold">{t.adminUsers.colStatus}</th>
                  <th className="px-5 py-3 font-semibold">{sb.colProvider}</th>
                  <th className="px-5 py-3 font-semibold">{sb.colPeriodEnd}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={s.userName} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{s.userName}</p>
                          <p className="truncate text-xs text-slate-400">{s.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={s.plan === "pro" ? "violet" : "slate"} className="capitalize">
                        {sb.plans[s.plan] ?? s.plan}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {s.status === "active" ? (
                        <Badge tone="emerald">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {sb.active}
                        </Badge>
                      ) : (
                        <Badge tone="slate">{sb.inactive}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 capitalize">
                      {s.provider ? (sb.providers[s.provider] ?? s.provider) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {s.currentPeriodEnd ? fmt.date(s.currentPeriodEnd) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ActionMenu
                        items={[
                          ...(s.status !== "active"
                            ? [
                                {
                                  label: sb.grant,
                                  icon: <BadgePlus className="h-4 w-4" />,
                                  onClick: () => handleGrant(s.userId),
                                },
                              ]
                            : []),
                          ...(s.status === "active"
                            ? [
                                {
                                  label: sb.revoke,
                                  icon: <Trash2 className="h-4 w-4" />,
                                  danger: true as const,
                                  onClick: () => setToRevoke(s),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
        )}
      </Card>

      {/* Grant Pro dialog */}
      {grantOpen && (
        <GrantProDialog
          users={users}
          busy={busy}
          onCancel={() => setGrantOpen(false)}
          onGrant={handleGrant}
        />
      )}

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!toRevoke}
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title={sb.revokeTitle}
        description={
          <>
            {sb.revokeBefore}{" "}
            <span className="font-semibold text-slate-700">{toRevoke?.userName}</span>
            {sb.revokeAfter}
          </>
        }
        confirmLabel={sb.revoke}
        busy={busy}
        onConfirm={confirmRevoke}
        onCancel={() => setToRevoke(null)}
      />
    </div>
  );
}

function GrantProDialog({
  users,
  busy,
  onCancel,
  onGrant,
}: {
  users: AdminUser[];
  busy: boolean;
  onCancel: () => void;
  onGrant: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const { t } = useI18n();
  const sb = t.adminSubscriptions;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [users, query]);

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <h2 className="text-base font-bold text-slate-900">{sb.grantTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{sb.grantHint}</p>

        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder={t.adminUsers.search}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-100">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">{sb.noUsers}</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50",
                    selected?.id === u.id && "bg-violet-50",
                  )}
                >
                  <InitialsAvatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{u.name}</p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                  </div>
                  {selected?.id === u.id && (
                    <BadgeCheck className="ml-auto h-4 w-4 shrink-0 text-violet-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onCancel} disabled={busy}>
            {t.common.actions.cancel}
          </AdminButton>
          <AdminButton
            onClick={() => selected && onGrant(selected.id)}
            disabled={busy || !selected}
          >
            {busy ? sb.granting : sb.grant}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
