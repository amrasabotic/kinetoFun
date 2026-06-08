"use client";

import { useMemo } from "react";
import { gamesService } from "@/services";
import { sessions, games as allGames } from "@/mock";
import { useSession } from "@/features/auth/session-context";
import { GameRail } from "@/components/game/GameRail";
import { ButtonLink } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { playersLabel } from "@/lib/format";
import type { Game, GameCategory } from "@/types";

const CATEGORY_RAILS: GameCategory[] = ["Action", "Adventure", "Puzzle", "Sports"];

export default function HomePage() {
  const { user } = useSession();
  const featured = gamesService.featured();
  const spotlight = featured[0];

  const continuePlaying = useMemo<Game[]>(() => {
    if (!user) return [];
    const ids = new Set(
      sessions
        .filter((s) => s.players.includes(user.id))
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .map((s) => s.gameId),
    );
    return [...ids]
      .map((id) => allGames.find((g) => g.id === id))
      .filter((g): g is Game => Boolean(g));
  }, [user]);

  return (
    <div className="space-y-12">
      {/* Hero spotlight */}
      {spotlight ? (
        <section
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${spotlight.cover} p-8 sm:p-12`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative max-w-2xl">
            <Badge tone="default" className="mb-4 bg-black/40">
              Featured
            </Badge>
            <p className="text-sm font-medium text-zinc-200">
              {user ? `Welcome back, ${user.displayName}` : "Welcome to KinetoFun"}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white drop-shadow sm:text-6xl">
              {spotlight.title}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-zinc-100/90">
              {spotlight.tagline}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
              <StarRating rating={spotlight.rating} />
              <span aria-hidden>•</span>
              <span>{playersLabel(spotlight.players)}</span>
              <span aria-hidden>•</span>
              <span>{spotlight.category}</span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/games/${spotlight.id}/play`} size="lg">
                ▶ Play now
              </ButtonLink>
              <ButtonLink
                href={`/games/${spotlight.id}`}
                size="lg"
                variant="secondary"
              >
                More info
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {continuePlaying.length > 0 ? (
        <GameRail title="Continue playing" games={continuePlaying} />
      ) : null}

      <GameRail title="Featured games" games={featured} />

      {CATEGORY_RAILS.map((category) => (
        <GameRail
          key={category}
          title={category}
          games={gamesService.byCategory(category)}
          subtitle="View all"
        />
      ))}

      <GameRail title="All games" games={gamesService.list()} />
    </div>
  );
}
