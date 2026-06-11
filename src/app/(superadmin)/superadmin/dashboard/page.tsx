"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Gamepad2,
  FolderTree,
  Radio,
  PlayCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Trophy,
  TrendingUp,
  Activity,
  ScrollText,
} from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, StatCard, Skeleton, EmptyState, Badge } from "@/components/superadmin/ui";
import { AreaChart, BarList } from "@/components/superadmin/charts";
import { auditMeta, auditSentence } from "@/components/superadmin/audit";
import type { AuditLog } from "@/types";

interface DayPoint {
  date: string;
  value: number;
}
interface TopGame {
  gameId: string;
  title: string;
  playCount: number;
  category: string;
  coverImage?: string;
  cover?: string;
}
interface Analytics {
  totalUsers: number;
  newUsersLast7Days: number;
  totalSessions: number;
  activeSessionsNow: number;
  totalScores: number;
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  featuredGames: number;
  totalCategories: number;
  activeCategories: number;
  gamesPlayedToday: number;
  userGrowth: DayPoint[];
  playsPerDay: DayPoint[];
  topGames: TopGame[];
}
interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  who: string;
  text: string;
  at: string;
}

const TINT_BG: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-500",
};

export default function DashboardPage() {
  const { user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/audit-logs?limit=12").then((r) => (r.ok ? r.json() : { logs: [] })),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
    ])
      .then(([a, logsRes, usersRes]) => {
        if (!active) return;
        setData(a);

        const logs: ActivityItem[] = (logsRes.logs ?? []).map((l: AuditLog) => ({
          id: l.id,
          action: l.action,
          who: l.adminName,
          text: auditSentence(l),
          at: l.createdAt,
        }));
        const signups: ActivityItem[] = (usersRes.users ?? [])
          .slice(0, 8)
          .map((u: AdminUser) => ({
            id: `user-${u.id}`,
            action: "user.registered",
            who: u.name,
            text: `${u.name} registered an account`,
            at: u.createdAt,
          }));
        const merged = [...logs, ...signups]
          .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
          .slice(0, 10);
        setActivity(merged);
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

      {/* Overview metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading || !data ? (
          Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard tint="violet" icon={<Users className="h-5 w-5" />} value={data.totalUsers.toLocaleString()} label="Total Users" />
            <StatCard tint="sky" icon={<Gamepad2 className="h-5 w-5" />} value={data.totalGames.toLocaleString()} label="Total Games" />
            <StatCard tint="amber" icon={<FolderTree className="h-5 w-5" />} value={data.totalCategories.toLocaleString()} label="Categories" />
            <StatCard tint="rose" icon={<PlayCircle className="h-5 w-5" />} value={data.gamesPlayedToday.toLocaleString()} label="Played Today" />
            <StatCard tint="emerald" live icon={<Radio className="h-5 w-5" />} value={data.activeSessionsNow.toLocaleString()} label="Active Sessions" />
            <StatCard tint="emerald" icon={<CheckCircle2 className="h-5 w-5" />} value={data.publishedGames.toLocaleString()} label="Published" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="User Growth"
          subtitle="New sign-ups · last 14 days"
          icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
          loading={loading || !data}
        >
          {data && <AreaChart data={data.userGrowth} color="#7c3aed" valueLabel="new users" />}
        </ChartCard>
        <ChartCard
          title="Games Played Over Time"
          subtitle="Play sessions · last 14 days"
          icon={<Activity className="h-4 w-4 text-sky-500" />}
          loading={loading || !data}
        >
          {data && <AreaChart data={data.playsPerDay} color="#0ea5e9" valueLabel="plays" />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Activity className="h-4 w-4 text-slate-400" />
              Recent Activity
            </h3>
            <button
              onClick={() => router.push("/superadmin/audit-logs")}
              className="text-xs font-medium text-violet-600 transition hover:text-violet-700"
            >
              View all
            </button>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="space-y-1 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" />}
                title="No activity yet"
                description="Platform events — sign-ups, category and game changes — will show up here."
              />
            ) : (
              <ul>
                {activity.map((a) => {
                  const meta = auditMeta(a.action);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          TINT_BG[meta.tint],
                        )}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-700">{a.text}</p>
                        <p className="truncate text-xs text-slate-400">by {a.who}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{relativeTime(a.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Right column: quick actions + top games */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <QuickAction icon={<FolderTree className="h-4 w-4" />} label="Add a category" onClick={() => router.push("/superadmin/categories")} />
              <QuickAction icon={<Plus className="h-4 w-4" />} label="Add a game" onClick={() => router.push("/superadmin/games")} />
              <QuickAction icon={<Users className="h-4 w-4" />} label="Manage users" onClick={() => router.push("/superadmin/users")} />
              <QuickAction icon={<ScrollText className="h-4 w-4" />} label="View audit logs" onClick={() => router.push("/superadmin/audit-logs")} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Games
            </h3>
            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data || data.topGames.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">No plays recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topGames.map((g, i) => (
                    <li key={g.gameId} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                      <TopThumb game={g} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{g.title}</p>
                        <p className="truncate text-xs text-slate-400">{g.category}</p>
                      </div>
                      <Badge tone="slate">{g.playCount.toLocaleString()} plays</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Most popular games bar list */}
      {data && data.topGames.length > 0 && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            Most Popular Games
          </h3>
          <div className="mt-4">
            <BarList
              data={data.topGames.map((g) => ({ label: g.title, value: g.playCount, sub: "plays" }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function TopThumb({ game }: { game: TopGame }) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-900/5">
      {game.coverImage ? (
        <Image src={game.coverImage} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        <span className={cn("h-full w-full bg-gradient-to-br", game.cover || "from-violet-500 to-indigo-600")} />
      )}
    </span>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  loading,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {icon}
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">{loading ? <Skeleton className="h-44 w-full" /> : children}</div>
    </Card>
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
