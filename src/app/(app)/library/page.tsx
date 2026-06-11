"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGames } from "@/features/games/useGames";
import { selectCategories, searchGames } from "@/services/games.service";
import { GameCard } from "@/components/game/GameCard";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";
import type { GameCategory } from "@/types";

type Filter = "All" | GameCategory;

export default function LibraryPage() {
  const { games, loading } = useGames();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      if (["Action", "Adventure", "Puzzle", "Sports"].includes(normalized)) {
        setFilter(normalized as GameCategory);
      }
    }
  }, [searchParams]);

  const categories = useMemo<Filter[]>(
    () => ["All", ...selectCategories(games)],
    [games],
  );

  const results = useMemo(() => {
    const searched = searchGames(games, query);
    return filter === "All"
      ? searched
      : searched.filter((g) => g.category === filter);
  }, [games, query, filter]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Game Library
        </h1>
        <p className="text-muted-foreground">
          {loading
            ? "Loading games…"
            : `${results.length} ${results.length === 1 ? "game" : "games"} available`}
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <TextField
            label="Search"
            placeholder="Search games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              data-focusable
              onClick={() => setFilter(category)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none",
                filter === category
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "border border-border/50 bg-card/20 text-muted-foreground backdrop-blur-sm hover:border-primary/50 hover:bg-card/40 hover:text-foreground",
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl border border-border/40 bg-card/20"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="rounded-2xl border border-border/40 bg-card/10 p-12 text-center text-muted-foreground backdrop-blur-sm">
          No games match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {results.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
