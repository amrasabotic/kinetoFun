"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Gamepad2, Clock, Trophy, Star, Zap, type LucideIcon } from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useProfileStats } from "@/features/scores/useProfileStats";
import { useGames } from "@/features/games/useGames";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreList } from "@/components/profile/ScoreList";
import { formatDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user } = useSession();
  const { stats, loading, error } = useProfileStats();
  const { games } = useGames();

  if (!user) return null;

  const enrichedStats = useMemo(() => {
    if (!stats) return null;
    return {
      ...stats,
      recentScores: stats.recentScores.map((s) => ({
        ...s,
        game: games.find((g) => g.id === s.gameId),
      })),
      recentSessions: stats.recentSessions.map((s) => ({
        ...s,
        game: games.find((g) => g.id === s.gameId),
      })),
    };
  }, [stats, games]);

  const xpIntoLevel = user.xp % 1000;
  const xpPct = Math.round((xpIntoLevel / 1000) * 100);
  const avatarGradient = user.avatarColor || "from-primary/80 to-violet-700";

  return (
    <div className="space-y-5">
      {/* ── Profile hero ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md">
        {/* Banner */}
        <div className={`relative h-36 bg-gradient-to-br sm:h-44 ${avatarGradient}`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute right-4 top-4">
            <ButtonLink
              href="/settings"
              variant="secondary"
              className="border-white/25 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              Edit profile
            </ButtonLink>
          </div>
          {/* Wave bleeds banner color into the card body */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
            <svg className="block h-10 w-full sm:h-14" viewBox="0 0 1440 56" preserveAspectRatio="none">
              <path
                fill="var(--card)"
                d="M0,32 C200,56 440,8 720,32 C920,50 1160,10 1440,28 L1440,56 L0,56 Z"
              />
            </svg>
          </div>
        </div>

        {/* Card body */}
        <div className="px-6 pb-7">
          {/* Avatar + level — avatar overlaps the wave */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="rounded-2xl ring-4 ring-card">
              <Avatar user={user} size="xl" />
            </div>
            <div className="mb-1 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">Level {user.level}</span>
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {user.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 max-w-lg text-sm text-foreground/70">{user.bio}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Member since {formatDate(user.joinedAt)}
          </p>

          {/* XP bar */}
          <div className="mt-5 max-w-sm">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">XP Progress</span>
              <span className="tabular-nums text-muted-foreground">
                {xpIntoLevel.toLocaleString()} / 1,000
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats + activity ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          {error}
        </p>
      ) : enrichedStats ? (
        <>
          <section className="grid grid-cols-3 gap-4">
            <StatCard
              label="Games played"
              value={enrichedStats.gamesPlayed}
              Icon={Gamepad2}
              iconBg="bg-violet-500/15"
              iconColor="text-violet-400"
            />
            <StatCard
              label="Sessions"
              value={enrichedStats.totalSessions}
              Icon={Clock}
              iconBg="bg-sky-500/15"
              iconColor="text-sky-400"
            />
            <StatCard
              label="Best score"
              value={enrichedStats.bestScore.toLocaleString()}
              Icon={Trophy}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-400"
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recent scores */}
            <section className="space-y-3">
              <SectionHeading Icon={Star} label="Recent scores" />
              <ScoreList scores={enrichedStats.recentScores} />
            </section>

            {/* Recent sessions */}
            <section className="space-y-3">
              <SectionHeading Icon={Clock} label="Recent activity" />
              {enrichedStats.recentSessions.length === 0 ? (
                <p className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
                  No sessions yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {enrichedStats.recentSessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={session.game ? `/games/${session.game.id}` : "#"}
                        data-focusable
                        className="flex items-center gap-3 rounded-xl border border-border/30 bg-card px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none"
                      >
                        <span
                          className={`h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${
                            session.game?.cover ?? "from-zinc-600 to-zinc-800"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {session.game?.title ?? "Unknown game"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {session.players.length} player
                            {session.players.length > 1 ? "s" : ""} ·{" "}
                            {relativeTime(session.startedAt)}
                          </span>
                        </span>
                        {session.status === "active" && (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            Active
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 text-center shadow-sm">
      <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="text-2xl font-black text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeading({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
    </div>
  );
}
