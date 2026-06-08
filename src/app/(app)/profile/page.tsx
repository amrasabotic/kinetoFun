"use client";

import Link from "next/link";
import { useSession } from "@/features/auth/session-context";
import { profileService } from "@/services";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreList } from "@/components/profile/ScoreList";
import { formatDate, relativeTime } from "@/lib/format";

export default function ProfilePage() {
  const { user, isAuthenticated } = useSession();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-white">You&apos;re signed out</h1>
        <p className="text-muted">Sign in to view your profile and scores.</p>
        <ButtonLink href="/login">Sign in</ButtonLink>
      </div>
    );
  }

  const stats = profileService.getStats(user.id);
  const xpIntoLevel = user.xp % 1000;
  const xpPct = Math.round((xpIntoLevel / 1000) * 100);

  return (
    <div className="space-y-10">
      {/* Profile header */}
      <section className="flex flex-col items-start gap-6 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center">
        <Avatar user={user} size="xl" />
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight text-white">
            {user.displayName}
          </h1>
          <p className="text-muted">@{user.username}</p>
          {user.bio ? (
            <p className="mt-2 max-w-lg text-zinc-300">{user.bio}</p>
          ) : null}
          <p className="mt-2 text-sm text-muted">
            Member since {formatDate(user.joinedAt)}
          </p>

          {/* Level / XP */}
          <div className="mt-4 max-w-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">Level {user.level}</span>
              <span className="text-muted">{xpIntoLevel} / 1000 XP</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>
        <ButtonLink href="/settings" variant="secondary">
          Edit profile
        </ButtonLink>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Games played" value={stats.gamesPlayed} />
        <StatCard label="Sessions" value={stats.totalSessions} />
        <StatCard label="Best score" value={stats.bestScore.toLocaleString()} />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Recent scores */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Recent scores</h2>
          <ScoreList scores={stats.recentScores} />
        </section>

        {/* Recent sessions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Recent activity</h2>
          {stats.recentSessions.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
              No sessions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={session.game ? `/games/${session.game.id}` : "#"}
                    data-focusable
                    className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition hover:bg-surface-2 focus:bg-surface-2"
                  >
                    <span
                      className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${
                        session.game?.cover ?? "from-zinc-600 to-zinc-800"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-white">
                        {session.game?.title ?? "Unknown game"}
                      </span>
                      <span className="block text-xs text-muted">
                        {session.players.length} player
                        {session.players.length > 1 ? "s" : ""} ·{" "}
                        {relativeTime(session.startedAt)}
                      </span>
                    </span>
                    {session.status === "active" ? (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Active
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center">
      <div className="text-3xl font-black text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}
