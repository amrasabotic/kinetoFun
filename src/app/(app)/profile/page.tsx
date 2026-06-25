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
    <div className="space-y-6">
      {/* ── Profile hero ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-white/[0.12] shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Banner */}
        <div className={`relative h-36 bg-gradient-to-br sm:h-44 ${avatarGradient}`}>
          <div className="absolute inset-0 bg-black/25" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute right-4 top-4">
            <ButtonLink
              href="/settings"
              variant="secondary"
              className="border-white/25 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              Edit profile
            </ButtonLink>
          </div>
          {/* Wave transition into card */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
            <svg
              className="block h-10 w-full sm:h-14"
              viewBox="0 0 1440 56"
              preserveAspectRatio="none"
            >
              <path
                fill="var(--background)"
                d="M0,32 C200,56 440,8 720,32 C920,50 1160,10 1440,28 L1440,56 L0,56 Z"
              />
            </svg>
          </div>
        </div>

        {/* Content below banner */}
        <div className="relative bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-6 pb-7 backdrop-blur-xl">
          {/* Avatar row — overlaps banner */}
          <div className="-mt-11 mb-4 flex items-end justify-between">
            <div className="rounded-2xl ring-4 ring-background">
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
          <p className="text-sm text-foreground/50">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 max-w-lg text-sm text-foreground/70">{user.bio}</p>
          )}
          <p className="mt-1 text-xs text-foreground/35">
            Member since {formatDate(user.joinedAt)}
          </p>

          {/* XP bar */}
          <div className="mt-5 max-w-sm">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/55">XP Progress</span>
              <span className="font-semibold tabular-nums text-foreground/55">
                {xpIntoLevel.toLocaleString()} / 1,000
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 shadow-[0_0_10px_rgba(140,92,255,0.5)] transition-all duration-700"
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
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45">
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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent scores */}
            <section className="space-y-3">
              <SectionHeading Icon={Star} label="Recent scores" />
              <ScoreList scores={enrichedStats.recentScores} />
            </section>

            {/* Recent sessions */}
            <section className="space-y-3">
              <SectionHeading Icon={Clock} label="Recent activity" />
              {enrichedStats.recentSessions.length === 0 ? (
                <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45 backdrop-blur-xl">
                  No sessions yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {enrichedStats.recentSessions.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={session.game ? `/games/${session.game.id}` : "#"}
                        data-focusable
                        className="flex items-center gap-4 rounded-xl border border-white/[0.10] bg-gradient-to-r from-white/[0.05] to-white/[0.02] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-white/[0.16] hover:from-white/[0.08] hover:to-white/[0.04] focus:outline-none"
                      >
                        <span
                          className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${
                            session.game?.cover ?? "from-zinc-600 to-zinc-800"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground">
                            {session.game?.title ?? "Unknown game"}
                          </span>
                          <span className="block text-xs text-foreground/45">
                            {session.players.length} player
                            {session.players.length > 1 ? "s" : ""} ·{" "}
                            {relativeTime(session.startedAt)}
                          </span>
                        </span>
                        {session.status === "active" && (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
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
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 text-center backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div
        className={cn(
          "mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
          iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="text-2xl font-black text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-widest text-foreground/40">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{label}</h2>
    </div>
  );
}
