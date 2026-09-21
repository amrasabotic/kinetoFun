"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Users,
  Clock,
  Trophy,
  BarChart2,
  Flame,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  Card,
  StatCard,
  Skeleton,
  Badge,
  EmptyState,
  InitialsAvatar,
} from "@/components/superadmin/ui";
import { AreaChart } from "@/components/superadmin/charts";

interface DayPoint { date: string; value: number; }
interface GameTopPlayer { rank: number; userId: string; userName: string; bestScore: number; }
interface GameAnalytics {
  gameId: string;
  gameTitle: string;
  totalSessions: number;
  uniquePlayers: number;
  avgSessionMinutes: number;
  totalScores: number;
  sessionsPerDay: DayPoint[];
  topPlayers: GameTopPlayer[];
  mostActiveDay: string | null;
  peakConcurrent: number;
}

type Days = "14" | "30";

export default function GameAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<GameAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<Days>("30");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/games/${id}/analytics?days=${days}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error ?? "Failed"))))
      .then((d: GameAnalytics) => setData(d))
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [id, days]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/superadmin/games"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-violet-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Games
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <Skeleton className="inline-block h-6 w-48" />
            ) : (
              <>Analytics: <span className="text-violet-700">{data?.gameTitle ?? id}</span></>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Session activity and player performance.</p>
        </div>

        {/* Day range toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          {(["14", "30"] as Days[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                days === d
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* KPI Cards */}
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
            <StatCard tint="violet" icon={<Activity className="h-5 w-5" />} value={data?.totalSessions ?? 0} label="Total Sessions" />
            <StatCard tint="sky" icon={<Users className="h-5 w-5" />} value={data?.uniquePlayers ?? 0} label="Unique Players" />
            <StatCard
              tint="emerald"
              icon={<Clock className="h-5 w-5" />}
              value={`${data?.avgSessionMinutes ?? 0}m`}
              label="Avg Session"
            />
            <StatCard tint="amber" icon={<Trophy className="h-5 w-5" />} value={data?.totalScores ?? 0} label="Scores Submitted" />
          </>
        )}
      </div>

      {/* Sessions chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BarChart2 className="h-4 w-4 text-violet-500" />
          Sessions per Day
          <span className="ml-auto text-xs font-normal text-slate-400">Last {days} days</span>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : data && data.sessionsPerDay.length > 0 ? (
            <AreaChart data={data.sessionsPerDay} color="#7c3aed" valueLabel="sessions" />
          ) : (
            <EmptyState
              icon={<BarChart2 className="h-5 w-5" />}
              title="No session data"
              description="No sessions recorded in this period."
            />
          )}
        </div>
      </Card>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 10 Players */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Players
          </h3>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : !data || data.topPlayers.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-5 w-5" />}
                title="No scores yet"
                description="Players will appear here once scores are submitted."
              />
            ) : (
              <div className="space-y-2">
                {data.topPlayers.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-slate-400">
                      #{p.rank}
                    </span>
                    <InitialsAvatar name={p.userName} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-900">
                      {p.userName}
                    </span>
                    <Badge tone={p.rank <= 3 ? "amber" : "slate"}>
                      {p.bestScore.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Extra Stats */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Zap className="h-4 w-4 text-sky-500" />
            Activity Insights
          </h3>
          <div className="mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : (
              <>
                <InsightRow
                  icon={<Flame className="h-4 w-4 text-rose-500" />}
                  label="Most Active Day"
                  value={data?.mostActiveDay ?? "—"}
                />
                <InsightRow
                  icon={<Users className="h-4 w-4 text-sky-500" />}
                  label="Peak Concurrent"
                  value={data ? `${data.peakConcurrent} player${data.peakConcurrent !== 1 ? "s" : ""}` : "—"}
                />
                <InsightRow
                  icon={<Activity className="h-4 w-4 text-violet-500" />}
                  label="Sessions (this period)"
                  value={data?.sessionsPerDay.reduce((s, d) => s + d.value, 0).toString() ?? "—"}
                />
                <InsightRow
                  icon={<Trophy className="h-4 w-4 text-amber-500" />}
                  label="Ranked Players"
                  value={data?.topPlayers.length.toString() ?? "—"}
                />
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InsightRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {icon}
        {label}
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
