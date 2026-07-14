"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGames } from "@/features/games/useGames";
import { searchGames } from "@/services/games.service";
import { GameCard } from "@/components/game/GameCard";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

function LibraryContent() {
  const { games, loading } = useGames();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const featuredOnly = searchParams.get("featured") === "1";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: { categories: Category[] }) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const slug = searchParams.get("category");
    if (!slug || categories.length === 0) return;
    const match = categories.find((c) => c.slug === slug.toLowerCase());
    if (match) setSelectedCategory(match);
  }, [searchParams, categories]);

  const results = useMemo(() => {
    let filtered = searchGames(games, query);
    if (selectedCategory) {
      filtered = filtered.filter(
        (g) =>
          g.categoryId === selectedCategory.id ||
          g.category.toLowerCase() === selectedCategory.name.toLowerCase(),
      );
    }
    if (featuredOnly) {
      filtered = filtered.filter((g) => g.featured);
    }
    return filtered;
  }, [games, query, selectedCategory, featuredOnly]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Game Library
        </h1>
        <p className="text-muted-foreground">
          {loading
            ? "Loading games…"
            : `${results.length} ${results.length === 1 ? "game" : "games"} available${featuredOnly ? " — Featured" : ""}`}
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <TextField
            label="Search"
            placeholder="Search games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="!border-border/50 !bg-card/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            data-focusable
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none",
              selectedCategory === null
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "border border-border/50 bg-card/20 text-muted-foreground backdrop-blur-sm hover:border-primary/50 hover:bg-card/40 hover:text-foreground",
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              data-focusable
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none",
                selectedCategory?.id === category.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "border border-border/50 bg-card/20 text-muted-foreground backdrop-blur-sm hover:border-primary/50 hover:bg-card/40 hover:text-foreground",
              )}
            >
              {category.name}
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

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}
