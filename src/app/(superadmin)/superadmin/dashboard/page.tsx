"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Gamepad2,
  Radio,
  PlayCircle,
  UserPlus,
  Plus,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { relativeTime } from "@/lib/format";
import { Card, StatCard, Skeleton, InitialsAvatar, EmptyState } from "@/components/superadmin/ui";

interface Analytics {
  totalUsers: number;
  newUsersLast7Days: number;
  totalSessions: number;
  activeSessionsNow: number;
  totalScores: number;
  topGames: Array<{ gameId: string; title: string; sessionCount: number }>;
}
interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [gamesCount, setGamesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
      fetch("/api/admin/games").then((r) => (r.ok ? r.json() : { games: [] })),
    ])
      .then(([a, u, g]) => {
        if (!active) return;
        setData(a);
        setRecentUsers((u.users ?? []).slice(0, 6));
        setGamesCount((g.games ?? []).length);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.displayName?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {firstName}.
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening across KinetoFun today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              tint="violet"
              icon={<Users className="h-5 w-5" />}
              value={data.totalUsers.toLocaleString()}
              label="Total Users"
              hint={
                data.newUsersLast7Days > 0 ? (
                  <span className="font-medium text-emerald-600">
                    +{data.newUsersLast7Days} this week
                  </span>
                ) : (
                  "No new signups this week"
                )
              }
            />
            <StatCard
              tint="sky"
              icon={<Gamepad2 className="h-5 w-5" />}
              value={(gamesCount ?? 0).toLocaleString()}
              label="Total Games"
              hint="In the catalog"
            />
            <StatCard
              tint="emerald"
              live
              icon={<Radio className="h-5 w-5" />}
              value={data.activeSessionsNow.toLocaleString()}
              label="Active Sessions"
              hint="Being played right now"
            />
            <StatCard
              tint="amber"
              icon={<PlayCircle className="h-5 w-5" />}
              value={data.totalSessions.toLocaleString()}
              label="Total Plays"
              hint={`${data.totalScores.toLocaleString()} scores recorded`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Platform Activity</h3>
            <button
              onClick={() => router.push("/superadmin/users")}
              className="text-xs font-medium text-violet-600 transition hover:text-violet-700"
            >
              View all
            </button>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="space-y-1 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUsers.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="h-6 w-6" />}
                title="No activity yet"
                description="New registrations and changes will show up here."
              />
            ) : (
              <ul>
                {recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <InitialsAvatar name={u.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{u.name}</span>{" "}
                        registered an account
                      </p>
                      <p className="truncate text-xs text-slate-400">{u.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {relativeTime(u.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Right column: quick actions + top games */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <QuickAction
                icon={<Plus className="h-4 w-4" />}
                label="Add a game"
                onClick={() => router.push("/superadmin/games")}
              />
              <QuickAction
                icon={<Users className="h-4 w-4" />}
                label="Manage users"
                onClick={() => router.push("/superadmin/users")}
              />
              <QuickAction
                icon={<Gamepad2 className="h-4 w-4" />}
                label="Manage games"
                onClick={() => router.push("/superadmin/games")}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Games
            </h3>
            <div className="mt-3 space-y-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))
              ) : !data || data.topGames.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">No plays recorded yet.</p>
              ) : (
                data.topGames.map((g, i) => (
                  <div
                    key={g.gameId}
                    className="flex items-center justify-between rounded-lg px-2 py-2 transition hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-700">
                        {g.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {g.sessionCount} plays
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-focusable
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3 text-left transition-all duration-200 hover:border-violet-200 hover:bg-violet-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <ArrowRight className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-violet-500" />
    </button>
  );
}

function KpiSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-24" />
    </Card>
  );
}
