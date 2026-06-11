"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useGames } from "@/features/games/useGames";
import { useLeaderboard } from "@/features/scores/useLeaderboard";
import { findGame, selectByCategory } from "@/services/games.service";
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
  const { games, loading } = useGames();
  const game = findGame(games, params.id);
  const { entries: topScores } = useLeaderboard(game?.id ?? null);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Game not found</h1>
        <p className="text-sm text-foreground/45">
          We couldn&apos;t find a game with that id.
        </p>
        <ButtonLink href="/library" variant="primary">
          Back to Library
        </ButtonLink>
      </div>
    );
  }
  const related = selectByCategory(games, game.category).filter(
    (g) => g.id !== game.id,
  );

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br p-8 sm:p-14">
        {game.coverImage ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="absolute inset-0 object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
            priority
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${game.cover}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative max-w-2xl">
          <Badge tone="accent" className="mb-4">
            {game.category}
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow sm:text-6xl">
            {game.title}
          </h1>
          <p className="mt-3 text-lg text-white/80">{game.tagline}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <StarRating rating={game.rating} />
            <span aria-hidden>·</span>
            <span>{playersLabel(game.players)}</span>
            <span aria-hidden>·</span>
            <span>{game.releaseYear}</span>
            <span aria-hidden>·</span>
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
        <div className="space-y-5 lg:col-span-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold text-foreground">About</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
              // {game.category}
            </span>
          </div>
          <p className="text-base leading-relaxed text-foreground/70">
            {game.description}
          </p>

          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-foreground">Top scores</h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
                // global
              </span>
            </div>
            <ButtonLink href="/leaderboard" variant="ghost" size="sm">
              See all
            </ButtonLink>
          </div>
          <LeaderboardTable entries={topScores} highlightUserId={user?.id} />
        </div>
      </div>

      {related.length > 0 && (
        <GameRail title="More like this" games={related} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
