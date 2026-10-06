"use client";

import Link from "next/link";
import { Flame, Gift, Sparkles, Ticket } from "lucide-react";
import { useRewards } from "@/features/rewards/useRewards";
import { useGames } from "@/features/games/useGames";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RewardsOverview } from "@/lib/rewards/catalog";

export function RewardsPanel() {
  const { rewards, loading, error } = useRewards();
  const { games } = useGames();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  if (error || !rewards) {
    return (
      <p className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
        {error ?? "Rewards are unavailable right now."}
      </p>
    );
  }

  const earnedCount = rewards.badges.filter((b) => b.earnedAt).length;
  // Earned badges first, most recent at the front; locked ones keep catalogue order.
  const badges = [...rewards.badges].sort((a, b) => {
    if (a.earnedAt && b.earnedAt) return b.earnedAt.localeCompare(a.earnedAt);
    return Number(Boolean(b.earnedAt)) - Number(Boolean(a.earnedAt));
  });
  const gameTitle = (id: string | null) =>
    id ? games.find((g) => g.id === id)?.title : undefined;

  return (
    <section id="rewards" className="scroll-mt-24 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Ticket className="h-4 w-4" /> Tickets
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-foreground">
            {rewards.balance.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rewards.rewardedGamesToday} / {rewards.maxRewardedGamesPerDay} ticket games today
          </p>
        </div>
        <div className="rounded-2xl border border-orange-300/40 bg-orange-400/10 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
            <Flame className="h-4 w-4" /> Daily streak
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-foreground">
            {rewards.streak.current} day{rewards.streak.current === 1 ? "" : "s"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rewards.streak.playedToday
              ? `Best: ${rewards.streak.best} days`
              : "Finish a game today to keep it going!"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Badges</h2>
          <span className="text-xs text-muted-foreground">
            {earnedCount} / {rewards.badges.length} earned
          </span>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {badges.map((badge) => (
            <li
              key={badge.id}
              title={badge.description}
              className={cn(
                "flex flex-col items-center rounded-xl border p-3 text-center",
                badge.earnedAt
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/40 bg-muted/30 opacity-60",
              )}
            >
              <span className={cn("text-3xl", !badge.earnedAt && "grayscale")} aria-hidden>
                {badge.emoji}
              </span>
              <span className="mt-1 text-xs font-bold leading-tight text-foreground">
                {badge.title}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                {badge.earnedAt ? relativeTime(badge.earnedAt) : badge.description}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Collectibles collections={rewards.collections} gameTitle={gameTitle} />

      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Gift className="h-4 w-4 text-primary" /> Recent tickets
        </h2>
        {rewards.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Finish a game to earn your first tickets.
          </p>
        ) : (
          <ul className="divide-y divide-border/30">
            {rewards.recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{entry.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[gameTitle(entry.gameId), relativeTime(entry.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-bold tabular-nums",
                    entry.delta > 0 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground",
                  )}
                >
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Collectibles({
  collections,
  gameTitle,
}: {
  collections: RewardsOverview["collections"];
  gameTitle: (id: string | null) => string | undefined;
}) {
  const withProgress = collections
    .map((c) => ({ ...c, earned: c.items.filter((i) => i.earnedAt).length }))
    .sort((a, b) => b.earned - a.earned);
  const started = withProgress.filter((c) => c.earned > 0);
  const notStarted = withProgress.filter((c) => c.earned === 0);
  const total = withProgress.reduce((sum, c) => sum + c.items.length, 0);
  const earnedTotal = withProgress.reduce((sum, c) => sum + c.earned, 0);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Collectibles
        </h2>
        <span className="text-xs text-muted-foreground">
          {earnedTotal} / {total} collected
        </span>
      </div>

      {started.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Unlock achievements inside these games to fill your collection.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {started.map((c) => (
            <li key={c.gameId} className="rounded-xl border border-border/30 p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <Link href={`/games/${c.gameId}`} className="font-semibold text-foreground hover:underline">
                  {gameTitle(c.gameId) ?? c.gameId}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {c.earned} / {c.items.length}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {c.items.map((item) => (
                  <li
                    key={item.id}
                    title={`${item.title}: ${item.description}`}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      item.earnedAt
                        ? "bg-primary/10 font-medium text-foreground"
                        : "bg-muted/40 text-muted-foreground opacity-60",
                    )}
                  >
                    <span className={cn(!item.earnedAt && "grayscale")} aria-hidden>{item.emoji}</span>
                    {item.title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {notStarted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {notStarted.map((c) => (
            <Link
              key={c.gameId}
              href={`/games/${c.gameId}`}
              data-focusable
              className="rounded-full border border-border/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {gameTitle(c.gameId) ?? c.gameId} · 0/{c.items.length}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
