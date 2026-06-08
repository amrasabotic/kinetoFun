import { GameCard } from "./GameCard";
import type { Game } from "@/types";

/**
 * A horizontally scrolling row of games with a heading — the Netflix/console
 * style browsing primitive. Focusing a card scrolls it into view (handled by
 * the spatial-navigation system).
 */
export function GameRail({
  title,
  games,
  subtitle,
}: {
  title: string;
  games: Game[];
  subtitle?: string;
}) {
  if (games.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <span className="text-sm text-muted">{subtitle}</span>
        ) : null}
      </div>
      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-4 [scrollbar-width:thin]">
        {games.map((game) => (
          <div key={game.id} className="w-52 shrink-0 sm:w-56">
            <GameCard game={game} />
          </div>
        ))}
      </div>
    </section>
  );
}
