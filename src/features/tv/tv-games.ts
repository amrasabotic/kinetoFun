import type { Game } from "@/types";
import { getGameEntry } from "@/games/registry";

/** Games the TV may list: built, and marked TV-ready by a superadmin. */
export function tvGames(games: Game[]): Game[] {
  // Before migration 0018 no game carries the flag, so every built game is listed.
  const flagged = games.some((g) => g.tvReady !== undefined);
  return games.filter((g) => getGameEntry(g.id) && (!flagged || g.tvReady));
}
