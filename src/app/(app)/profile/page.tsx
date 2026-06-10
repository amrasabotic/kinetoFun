"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "@/features/auth/session-context";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useProfileStats } from "@/features/scores/useProfileStats";
import { useGames } from "@/features/games/useGames";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreList } from "@/components/profile/ScoreList";
import { formatDate, relativeTime } from "@/lib/format";

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

  // Enrich scores + sessions with game objects from the cached catalog.
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

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-xl sm:flex sm:items-center sm:gap-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-primary/40 blur-sm" />

        <Avatar user={user} size="xl" />

        <div className="mt-5 flex-1 sm:mt-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-foreground/40">
            // Player profile
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">
            {user.displayName}
          </h1>
          <p className="text-sm text-foreground/45">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 max-w-lg text-sm text-foreground/70">{user.bio}</p>
          )}
          <p className="mt-1 text-xs text-foreground/35">
            Member since {formatDate(user.joinedAt)}
          </p>

          <div className="mt-4 max-w-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Level {user.level}</span>
              <span className="text-xs text-foreground/45">{xpIntoLevel} / 1000 XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 shadow-[0_0_10px_rgba(140,92,255,0.5)] transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        <ButtonLink href="/settings" variant="secondary" className="mt-6 sm:mt-0 sm:self-start">
          Edit profile
        </ButtonLink>
      </section>

      {/* Stats */}
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
            <StatCard label="Games played" value={enrichedStats.gamesPlayed} />
            <StatCard label="Sessions" value={enrichedStats.totalSessions} />
            <StatCard label="Best score" value={enrichedStats.bestScore.toLocaleString()} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent scores */}
            <section className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-foreground">Recent scores</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
                  // latest runs
                </span>
              </div>
              <ScoreList scores={enrichedStats.recentScores} />
            </section>

            {/* Recent sessions */}
            <section className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-foreground">Recent activity</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
                  // sessions
                </span>
              </div>
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
                        className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.12] focus:outline-none"
                      >
                        <span
                          className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${
                            session.game?.cover ?? "from-zinc-600 to-zinc-800"
                          }`}
                        />
                        <span className="flex-1 min-w-0">
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="text-3xl font-black text-foreground sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-widest text-foreground/40">{label}</div>
    </div>
  );
}
