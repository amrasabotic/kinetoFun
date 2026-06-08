"use client";

import { useParams } from "next/navigation";
import { gamesService, leaderboardService } from "@/services";
import { useSession } from "@/features/auth/session-context";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { GameRail } from "@/components/game/GameRail";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { playersLabel } from "@/lib/format";

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useSession();
  const game = gamesService.getById(params.id);

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-white">Game not found</h1>
        <p className="text-muted">
          We couldn&apos;t find a game with that id.
        </p>
        <ButtonLink href="/library" variant="secondary">
          Back to Library
        </ButtonLink>
      </div>
    );
  }

  const topScores = leaderboardService.forGame(game.id, 5);
  const related = gamesService
    .byCategory(game.category)
    .filter((g) => g.id !== game.id);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${game.cover} p-8 sm:p-14`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative max-w-2xl">
          <Badge tone="accent" className="mb-4">
            {game.category}
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow sm:text-6xl">
            {game.title}
          </h1>
          <p className="mt-3 text-lg text-zinc-100/90">{game.tagline}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
            <StarRating rating={game.rating} />
            <span aria-hidden>•</span>
            <span>{playersLabel(game.players)}</span>
            <span aria-hidden>•</span>
            <span>{game.releaseYear}</span>
            <span aria-hidden>•</span>
            <span>~{game.durationMinutes} min</span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={`/games/${game.id}/play`} size="lg">
              ▶ Play now
            </ButtonLink>
            <ButtonLink href="/library" size="lg" variant="secondary">
              Back to Library
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Description */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-2xl font-bold text-white">About</h2>
          <p className="text-lg leading-relaxed text-zinc-300">
            {game.description}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Players" value={`${game.minPlayers}–${game.maxPlayers}`} />
            <Stat label="Category" value={game.category} />
            <Stat label="Released" value={String(game.releaseYear)} />
            <Stat label="Session" value={`~${game.durationMinutes} min`} />
            <Stat label="Rating" value={`${game.rating.toFixed(1)} / 5`} />
            <Stat label="Mode" value={playersLabel(game.players)} />
          </dl>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Top scores</h2>
            <ButtonLink
              href="/leaderboard"
              variant="ghost"
              size="sm"
            >
              See all
            </ButtonLink>
          </div>
          <LeaderboardTable entries={topScores} highlightUserId={user?.id} />
        </div>
      </div>

      {related.length > 0 ? (
        <GameRail title="More like this" games={related} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}
