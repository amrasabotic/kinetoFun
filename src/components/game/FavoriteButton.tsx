"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/features/games/useFavorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ gameId, className }: { gameId: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(gameId);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleFavorite(gameId);
      }}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-colors",
        active
          ? "border-rose-400/40 bg-rose-500/25 text-rose-300"
          : "border-white/20 bg-black/35 text-white/70 hover:text-white",
        className,
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", active && "fill-rose-400")} />
    </button>
  );
}
