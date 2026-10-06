"use client";

import { Flame, Gift, Ticket } from "lucide-react";
import { useRewards } from "@/features/rewards/useRewards";
import { useGames } from "@/features/games/useGames";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

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
