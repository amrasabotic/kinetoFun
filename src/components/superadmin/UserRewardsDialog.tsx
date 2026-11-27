"use client";

import { useEffect, useState } from "react";
import { Flame, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { RewardsOverview } from "@/lib/rewards/catalog";
import { AdminButton, InitialsAvatar, Skeleton } from "@/components/superadmin/ui";

interface Props {
  user: { id: string; name: string; email: string };
  /** Only superadmins may change balances; admins get a read-only view. */
  canAdjust: boolean;
  onClose: () => void;
  /** Called with the new balance after a successful adjustment. */
  onAdjusted: (balance: number) => void;
}

export function UserRewardsDialog({ user, canAdjust, onClose, onAdjusted }: Props) {
  const [data, setData] = useState<RewardsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { t, fmt, serverText } = useI18n();
  const r_ = t.adminUsers.rewardsDialog;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${user.id}/rewards`)
      .then(async (res) => {
        if (!res.ok) throw new Error(r_.unavailable);
        return (await res.json()) as RewardsOverview;
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : serverText("Failed to load rewards."));
      });
    return () => { cancelled = true; };
  }, [user.id, reloadKey, r_, serverText]);

  async function submit() {
    const n = Number.parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setFormError(r_.positive);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: direction === "add" ? n : -n, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { balance?: number; error?: string };
      if (!res.ok || json.balance === undefined) throw new Error(json.error ?? "Failed to adjust tickets.");
      onAdjusted(json.balance);
      setAmount("");
      setReason("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(serverText(err instanceof Error ? err.message : "Failed to adjust tickets."));
    } finally {
      setBusy(false);
    }
  }

  const earnedBadges = data?.badges.filter((b) => b.earnedAt).length ?? 0;
  const collectibles = data?.collections.reduce(
    (sum, c) => sum + c.items.filter((i) => i.earnedAt).length,
    0,
  ) ?? 0;

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <button
          onClick={onClose}
          aria-label={t.common.actions.close}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <InitialsAvatar name={user.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{user.name}</h2>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-600">{loadError}</p>
        ) : !data ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              <Stat label={t.profile.rewards.tickets} value={fmt.number(data.balance)} icon={<Ticket className="h-3.5 w-3.5" />} />
              <Stat label={r_.streak} value={r_.streakValue(data.streak.current)} icon={<Flame className="h-3.5 w-3.5" />} />
              <Stat label={t.profile.rewards.badges} value={`${earnedBadges}/${data.badges.length}`} />
              <Stat label={t.profile.rewards.collectibles} value={collectibles} />
            </div>

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.profile.rewards.recent}</h3>
            {data.recent.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">{r_.none}</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-slate-600">
                      {fmt.rewardLabel(r.label)}
                      <span className="ml-2 text-xs text-slate-400">{fmt.relative(r.createdAt)}</span>
                    </span>
                    <span className={cn("font-semibold tabular-nums", r.delta > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {r.delta > 0 ? "+" : ""}{r.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {canAdjust && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{r_.adjust}</h3>
                <div className="mt-3 flex gap-2">
                  <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm">
                    {(["add", "remove"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDirection(d)}
                        className={cn(
                          "px-3 py-2 font-medium capitalize transition",
                          direction === d ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50",
                        )}
                      >
                        {r_[d]}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={r_.amount}
                    className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  placeholder={r_.reason}
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                {formError && <p className="mt-2 text-sm text-rose-600">{formError}</p>}
                <div className="mt-3 flex justify-end">
                  <AdminButton onClick={submit} disabled={busy || !amount || reason.trim().length < 3}>
                    {busy ? t.common.actions.saving : direction === "add" ? r_.addTickets : r_.removeTickets}
                  </AdminButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-3">
      <div className="flex items-center justify-center gap-1 text-base font-bold text-slate-900">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
