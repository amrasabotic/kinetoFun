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
import { useI18n } from "@/features/i18n/I18nProvider";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";

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
  const { t, fmt } = useI18n();
  const h = t.tv.home;

  const tabs: Tab[] = [
    {
      id: "recent",
      label: t.home.dashboard.continuePlaying,
      games: recentIds.flatMap((id) => playable.find((g) => g.id === id) ?? []),
    },
    { id: "favorites", label: t.home.dashboard.favorites, games: playable.filter((g) => isFavorite(g.id)) },
    { id: "all", label: t.home.dashboard.allGames, games: playable },
    ...CATEGORY_ORDER.map((category) => ({
      id: category.toLowerCase(),
      label: fmt.category(category),
      games: playable.filter((g) => g.category === category),
    })),
  ].filter((tab) => tab.games.length > 0);

  if (!signedIn || gamesLoading || recentLoading || !favoritesLoaded) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-8" role="status">
        <LoaderCircle className="h-20 w-20 animate-spin text-primary" />
        <p className="text-3xl text-white/60">{h.loading}</p>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <p className="py-40 text-center text-4xl font-bold text-white/70">
        {h.empty}
      </p>
    );
  }

  const tab = tabs.find((x) => x.id === searchParams.get("tab")) ?? tabs[0];
  const pageCount = Math.ceil(tab.games.length / PAGE_SIZE);
  const page = Math.min(Math.max(Number(searchParams.get("page")) || 1, 1), pageCount);
  const visible = tab.games.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const show = (tabId: string, pageNumber: number) => {
    const query = `?tab=${encodeURIComponent(tabId)}&page=${pageNumber}`;
    saveTvHomeQuery(query);
    router.replace(`/tvsetup/games${query}`, { scroll: false });
  };

  const firstName = user?.displayName?.split(" ")[0] || h.player;

  return (
    <div className="flex h-[calc(100vh_-_var(--spacing)*24)] flex-col gap-7">
      <header className="flex items-center justify-between">
        <h1 className="text-5xl font-black tracking-tight">{h.hi(firstName)}</h1>
        <div className="flex items-center gap-6">
          <LanguagePicker variant="tv" tone="dark" className="gap-3! [&_button]:min-w-0 [&_button]:h-16 [&_button]:px-6 [&_button]:py-0 [&_button]:text-2xl" />
          <Link
            href="/tvsetup/shop"
            data-focusable
            className="flex h-16 items-center gap-3 rounded-full bg-amber-400 px-7 text-2xl font-black text-amber-950"
          >
            <Ticket className="h-7 w-7" />
            {user?.tickets ?? 0}
            <span className="ml-1 rounded-full bg-amber-950/15 px-4 py-1">{h.shop}</span>
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-4" aria-label={h.lists}>
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            data-focusable
            aria-pressed={x.id === tab.id}
            onClick={() => show(x.id, 1)}
            className={cn(
              "h-16 rounded-full px-8 text-2xl font-bold transition",
              x.id === tab.id ? "bg-primary text-white" : "bg-white/10 text-white/80",
            )}
          >
            {x.label}
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
        {h.page(tab.label, page, pageCount)}
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
  const r = useI18n().t.profile.rewards;
  return (
    <button
      type="button"
      data-focusable
      data-dwell-repeat
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "previous" ? r.previousPage : r.nextPage}
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
