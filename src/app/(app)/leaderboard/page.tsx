"use client";

import { useState } from "react";
import { useGames } from "@/features/games/useGames";
import { useLeaderboard } from "@/features/scores/useLeaderboard";
import { useSession } from "@/features/auth/session-context";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { cn } from "@/lib/utils";

const GLOBAL = "global";

export default function LeaderboardPage() {
  const { user } = useSession();
  const { games: allGames } = useGames();
  const [selected, setSelected] = useState<string>(GLOBAL);

  const { entries, loading, error } = useLeaderboard(
    selected === GLOBAL ? null : selected,
  );

  const selectedTitle =
    selected === GLOBAL
      ? "Global best scores"
      : `${allGames.find((g) => g.id === selected)?.title ?? selected} leaderboard`;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Leaderboards
        </h1>
        <p className="text-muted-foreground">Top players across KinetoFun.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={selected === GLOBAL}
          onClick={() => setSelected(GLOBAL)}
        >
          Global
        </FilterChip>
        {allGames.map((game) => (
          <FilterChip
            key={game.id}
            active={selected === game.id}
            onClick={() => setSelected(game.id)}
          >
            {game.title}
          </FilterChip>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{selectedTitle}</h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45">
            No scores yet — be the first to play!
          </p>
        ) : (
          <LeaderboardTable entries={entries} highlightUserId={user?.id} />
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card/20 text-muted-foreground border border-border/40 hover:bg-muted/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
