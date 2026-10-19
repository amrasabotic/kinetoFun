"use client";

// /tvsetup/games/[id] — one game on the TV: details, best scores, and PLAY.
// A stop between the grid and the game, so a stray hold never launches one.

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, LoaderCircle, Play, Trophy } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UnlockWorldButton } from "@/components/game/UnlockWorldButton";
import { useSession } from "@/features/auth/session-context";
import { useGames } from "@/features/games/useGames";
import { useFavorites } from "@/features/games/useFavorites";
import { useLeaderboard } from "@/features/scores/useLeaderboard";
import { useShop } from "@/features/rewards/useShop";
import { useTvSignedIn } from "@/features/tv/useTvSignedIn";
import { tvHomeHref } from "@/features/tv/tv-home-state";
import { findGame } from "@/services/games.service";
import { getGameEntry } from "@/games/registry";
import { formatScore, playersLabel } from "@/lib/format";

export default function TvGamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const signedIn = useTvSignedIn();
  const { user } = useSession();
  const { games, loading } = useGames();
  const game = findGame(games, params.id);
  const { entries } = useLeaderboard(game?.id ?? null);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Same rule as the desktop game page: admins can always play secret worlds.
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const needsUnlockCheck = Boolean(signedIn && game?.unlockCost && !isAdmin);
  const { shop, error: shopError, refresh: refreshShop } = useShop(needsUnlockCheck);
  const world = shop?.worlds.find((w) => w.gameId === game?.id);
  const locked = Boolean(world && !world.unlocked);

  const goBack = () => router.push(tvHomeHref());

  // If the shop is unreachable, PLAY still works: the play page enforces the lock.
  if (!signedIn || loading || (needsUnlockCheck && !shop && !shopError)) {
    return (
      <div className="flex h-[70vh] items-center justify-center" role="status">
        <LoaderCircle className="h-20 w-20 animate-spin text-primary" />
      </div>
    );
  }

  if (!game || !getGameEntry(game.id)) {
    return (
      <div className="flex flex-col items-center gap-10 py-32 text-center">
        <h1 className="text-5xl font-black">This game isn&apos;t available</h1>
        <Button size="lg" onClick={goBack} className="h-20 px-14 text-3xl!">
          Back to games
        </Button>
      </div>
    );
  }

  const image = game.coverImage || game.thumbnail;
  const top = entries[0];
  const mine = user ? entries.find((e) => e.user.id === user.id) : undefined;
  const favorite = isFavorite(game.id);

  return (
    <div className="flex h-[calc(100vh_-_var(--spacing)*24)] flex-col gap-8">
      <Button
        variant="secondary"
        size="lg"
        onClick={goBack}
        className="h-16 self-start px-8 text-2xl! text-white!"
      >
        <ArrowLeft className="h-7 w-7" />
        Back
      </Button>

      <div className="flex min-h-0 flex-1 items-center gap-14">
        <div className="relative aspect-video w-[48%] shrink-0 overflow-hidden rounded-3xl bg-white/5">
          {image ? (
            <Image src={image} alt="" fill sizes="48vw" className="object-cover" priority />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${game.cover}`} />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <p className="text-2xl font-bold uppercase tracking-[0.2em] text-accent">{game.category}</p>
          <h1 className="text-6xl font-black leading-tight tracking-tight">{game.title}</h1>
          <p className="text-3xl text-white/70">{game.tagline}</p>
          <p className="text-2xl text-white/50">
            {playersLabel(game.players)} · about {game.durationMinutes} min
          </p>

          {(top || mine) && (
            <div className="flex flex-wrap gap-8 text-2xl">
              {top && (
                <p className="flex items-center gap-3">
                  <Trophy className="h-7 w-7 text-accent" />
                  Top score {formatScore(top.score)}
                  <span className="text-white/50">· {top.user.displayName}</span>
                </p>
              )}
              {mine && <p>Your best {formatScore(mine.score)}</p>}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-start gap-6">
            {locked && world ? (
              // Bigger than its desktop size; its own two-step confirm stays as is.
              <div className="[&_button]:h-24 [&_button]:px-12 [&_button]:text-3xl [&_p]:text-2xl">
                <UnlockWorldButton
                  gameId={game.id}
                  title={game.title}
                  cost={world.unlockCost}
                  onUnlocked={refreshShop}
                />
              </div>
            ) : (
              <ButtonLink href={`/games/${game.id}/play`} size="lg" className="h-24 px-16 text-4xl!">
                <Play className="h-10 w-10 fill-current" />
                PLAY
              </ButtonLink>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void toggleFavorite(game.id)}
              aria-pressed={favorite}
              className="h-24 px-10 text-2xl! text-white!"
            >
              <Heart className={favorite ? "h-8 w-8 fill-destructive text-destructive" : "h-8 w-8"} />
              {favorite ? "Favorite" : "Add to favorites"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
