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
import { RateThisGame } from "@/components/game/RateThisGame";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { useI18n } from "@/features/i18n/I18nProvider";
import { useShop } from "@/features/rewards/useShop";
import { UnlockWorldButton } from "@/components/game/UnlockWorldButton";

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useSession();
  const { games, loading } = useGames();
  const { t, fmt } = useI18n();
  const d = t.games.detail;
  const game = findGame(games, params.id);
  const { entries: topScores } = useLeaderboard(game?.id ?? null);
  // Only secret worlds need the player's unlock status. Admins can always
  // play, matching the server-side check in POST /api/sessions.
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { shop, refresh: refreshShop } = useShop(Boolean(user && game?.unlockCost && !isAdmin));
  const world = shop?.worlds.find((w) => w.gameId === game?.id);
  const locked = Boolean(world && !world.unlocked);

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
        <h1 className="text-3xl font-bold text-foreground">{d.notFound}</h1>
        <p className="text-sm text-foreground/45">
          {d.notFoundBody}
        </p>
        <ButtonLink href="/library" variant="primary">
          {d.backToLibrary}
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
        {(game.coverImage || game.thumbnail) ? (
          <Image
            src={game.coverImage || game.thumbnail!}
            alt={game.title}
            fill
            className="absolute inset-0 object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
            priority
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${game.cover}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="relative max-w-2xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="accent">{fmt.category(game.category)}</Badge>
            {game.unlockCost && (
              <Badge tone="accent" className="bg-amber-400/90 !text-amber-950">
                {t.games.secretWorld}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow sm:text-6xl">
            {game.title}
          </h1>
          <p className="mt-3 text-lg text-white/80">{game.tagline}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <div className="flex items-center gap-1.5">
              <StarRating rating={game.rating} />
              {(game.ratingCount ?? 0) > 0 && (
                <span className="text-xs text-white/40">
                  ({d.ratings(game.ratingCount ?? 0)})
                </span>
              )}
            </div>
            <span aria-hidden>·</span>
            <span>{fmt.players(game.players)}</span>
            <span aria-hidden>·</span>
            <span>{game.releaseYear}</span>
            <span aria-hidden>·</span>
            <span>{d.minutes(game.durationMinutes)}</span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {locked && world ? (
              <UnlockWorldButton
                gameId={game.id}
                title={game.title}
                cost={world.unlockCost}
                onUnlocked={refreshShop}
              />
            ) : (
              <ButtonLink href={`/games/${game.id}/play`} size="lg">
                {t.home.dashboard.playNow}
              </ButtonLink>
            )}
            <ButtonLink href="/library" size="lg" variant="secondary" className="border-white/40 bg-white/15 text-white hover:bg-white/25">
              {d.backToLibrary}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Description */}
        <div className="space-y-5 lg:col-span-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold text-foreground">{d.about}</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
              // {fmt.category(game.category)}
            </span>
          </div>
          <p className="text-base leading-relaxed text-foreground/70">
            {game.description}
          </p>

          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={d.players} value={`${game.minPlayers}–${game.maxPlayers}`} />
            <Stat label={d.category} value={fmt.category(game.category)} />
            <Stat label={d.released} value={String(game.releaseYear)} />
            <Stat label={d.session} value={d.minutes(game.durationMinutes)} />
            <Stat
              label={d.rating}
              value={`${game.rating.toFixed(1)} / 5${(game.ratingCount ?? 0) > 0 ? ` (${game.ratingCount})` : ""}`}
            />
            <Stat label={d.mode} value={fmt.players(game.players)} />
          </dl>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-foreground">{d.topScores}</h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/35">
                // {d.global}
              </span>
            </div>
            <ButtonLink href="/leaderboard" variant="ghost" size="sm">
              {d.seeAll}
            </ButtonLink>
          </div>
          <LeaderboardTable entries={topScores} highlightUserId={user?.id} />
          {user && (
            <>
              <div className="mt-4 h-px bg-white/[0.08]" />
              <RateThisGame gameId={game.id} />
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <GameRail title={d.moreLikeThis} games={related} />
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
