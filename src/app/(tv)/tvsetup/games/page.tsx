"use client";

// /tvsetup/games — the TV's home screen: pick a tab, page through games, open one.

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle, Ticket } from "lucide-react";
import type { Game, GameCategory } from "@/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import { useGames } from "@/features/games/useGames";
import { useFavorites } from "@/features/games/useFavorites";
import { useContinuePlaying } from "@/features/sessions/useContinuePlaying";
import { useTvSignedIn } from "@/features/tv/useTvSignedIn";
import { saveTvHomeQuery } from "@/features/tv/tv-home-state";
import { tvGames } from "@/features/tv/tv-games";
import { TvGameCard } from "@/components/tv/TvGameCard";

const PAGE_SIZE = 8;
const CATEGORY_ORDER: GameCategory[] = ["Action", "Sports", "Arcade", "Puzzle", "Adventure", "Party"];

interface Tab {
  id: string;
  label: string;
  games: Game[];
}

function TvGamesHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signedIn = useTvSignedIn();
  const { user } = useSession();
  const { games, loading: gamesLoading } = useGames();
  const { gameIds: recentIds, loading: recentLoading } = useContinuePlaying(signedIn);
  const { isFavorite, loaded: favoritesLoaded } = useFavorites();

  const playable = useMemo(() => tvGames(games), [games]);

  const tabs: Tab[] = [
    {
      id: "recent",
      label: "Continue playing",
      games: recentIds.flatMap((id) => playable.find((g) => g.id === id) ?? []),
    },
    { id: "favorites", label: "Favorites", games: playable.filter((g) => isFavorite(g.id)) },
    { id: "all", label: "All games", games: playable },
    ...CATEGORY_ORDER.map((category) => ({
      id: category.toLowerCase(),
      label: category,
      games: playable.filter((g) => g.category === category),
    })),
  ].filter((tab) => tab.games.length > 0);

  if (!signedIn || gamesLoading || recentLoading || !favoritesLoaded) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-8" role="status">
        <LoaderCircle className="h-20 w-20 animate-spin text-primary" />
        <p className="text-3xl text-white/60">Loading your games…</p>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <p className="py-40 text-center text-4xl font-bold text-white/70">
        No games are ready for the TV yet.
      </p>
    );
  }

  const tab = tabs.find((t) => t.id === searchParams.get("tab")) ?? tabs[0];
  const pageCount = Math.ceil(tab.games.length / PAGE_SIZE);
  const page = Math.min(Math.max(Number(searchParams.get("page")) || 1, 1), pageCount);
  const visible = tab.games.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const show = (tabId: string, pageNumber: number) => {
    const query = `?tab=${encodeURIComponent(tabId)}&page=${pageNumber}`;
    saveTvHomeQuery(query);
    router.replace(`/tvsetup/games${query}`, { scroll: false });
  };

  const firstName = user?.displayName?.split(" ")[0] || "Player";

  return (
    <div className="flex h-[calc(100vh_-_var(--spacing)*24)] flex-col gap-7">
      <header className="flex items-center justify-between">
        <h1 className="text-5xl font-black tracking-tight">Hi, {firstName}!</h1>
        <Link
          href="/tvsetup/shop"
          data-focusable
          className="flex h-16 items-center gap-3 rounded-full bg-amber-400 px-7 text-2xl font-black text-amber-950"
        >
          <Ticket className="h-7 w-7" />
          {user?.tickets ?? 0}
          <span className="ml-1 rounded-full bg-amber-950/15 px-4 py-1">Shop</span>
        </Link>
      </header>

      <nav className="flex flex-wrap gap-4" aria-label="Game lists">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-focusable
            aria-pressed={t.id === tab.id}
            onClick={() => show(t.id, 1)}
            className={cn(
              "h-16 rounded-full px-8 text-2xl font-bold transition",
              t.id === tab.id ? "bg-primary text-white" : "bg-white/10 text-white/80",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 gap-6">
        <PageTile direction="previous" disabled={page <= 1} onClick={() => show(tab.id, page - 1)} />
        <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-6">
          {visible.map((game) => (
            <TvGameCard key={game.id} game={game} favorite={isFavorite(game.id)} />
          ))}
        </div>
        <PageTile direction="next" disabled={page >= pageCount} onClick={() => show(tab.id, page + 1)} />
      </div>

      <p className="text-center text-2xl text-white/50">
        {tab.label} · page {page} of {pageCount}
      </p>
    </div>
  );
}

function PageTile({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      data-focusable
      data-dwell-repeat
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "previous" ? "Previous page" : "Next page"}
      className="flex w-28 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-white transition disabled:opacity-20"
    >
      <Icon className="h-16 w-16" />
    </button>
  );
}

export default function TvGamesPage() {
  return (
    <Suspense fallback={<div className="h-[70vh]" />}>
      <TvGamesHome />
    </Suspense>
  );
}
