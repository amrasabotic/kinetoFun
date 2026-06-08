import Link from "next/link";
import { cn } from "@/lib/utils";
import { playersLabel } from "@/lib/format";
import type { Game } from "@/types";
import { Badge } from "@/components/ui/Badge";

/**
 * A game tile for rails and grids. Uses a gradient placeholder cover (no art
 * assets yet). Tagged `data-focusable` so the spatial-navigation system can
 * move to it with arrow keys / a future gesture.
 */
export function GameCard({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  return (
    <Link
      href={`/games/${game.id}`}
      data-focusable
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-transform duration-200 hover:scale-[1.03] focus:scale-[1.03]",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-[3/4] w-full bg-gradient-to-br",
          game.cover,
        )}
      >
        <div className="absolute inset-0 bg-black/10" />
        <span className="absolute left-3 top-3">
          <Badge tone="accent">{game.category}</Badge>
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <h3 className="text-lg font-bold leading-tight text-white drop-shadow">
            {game.title}
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2.5 text-xs text-muted">
        <span>{playersLabel(game.players)}</span>
        <span className="text-amber-400">★ {game.rating.toFixed(1)}</span>
      </div>
    </Link>
  );
}
