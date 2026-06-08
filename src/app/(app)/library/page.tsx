"use client";

import { useMemo, useState } from "react";
import { gamesService } from "@/services";
import { GameCard } from "@/components/game/GameCard";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";
import type { GameCategory } from "@/types";

type Filter = "All" | GameCategory;

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const categories = useMemo<Filter[]>(
    () => ["All", ...gamesService.categories()],
    [],
  );

  const results = useMemo(() => {
    const searched = gamesService.search(query);
    return filter === "All"
      ? searched
      : searched.filter((g) => g.category === filter);
  }, [query, filter]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Game Library
        </h1>
        <p className="text-muted">
          {results.length} {results.length === 1 ? "game" : "games"} available
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
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:bg-surface-2 hover:text-white",
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
          No games match “{query}”.
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
