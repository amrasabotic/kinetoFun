import { scores, users } from "@/mock";
import type { LeaderboardEntry, User } from "@/types";

function userById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

// Derives ranked leaderboards from the flat scores list. In Phase 2 this
// becomes a query / view in Supabase.
export const leaderboardService = {
  /** Top scores for a single game, ranked descending. */
  forGame(gameId: string, limit = 10): LeaderboardEntry[] {
    return scores
      .filter((s) => s.gameId === gameId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s, i) => ({
        rank: i + 1,
        user: userById(s.userId)!,
        score: s.score,
        gameId: s.gameId,
      }))
      .filter((entry) => entry.user);
  },

  /**
   * Global ranking by each user's best single score across all games.
   * A pragmatic stand-in until real aggregate stats exist.
   */
  global(limit = 10): LeaderboardEntry[] {
    const bestByUser = new Map<string, number>();
    for (const s of scores) {
      const current = bestByUser.get(s.userId) ?? 0;
      if (s.score > current) bestByUser.set(s.userId, s.score);
    }

    return Array.from(bestByUser.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, i) => ({
        rank: i + 1,
        user: userById(entry.userId)!,
        score: entry.score,
        gameId: "global",
      }))
      .filter((entry) => entry.user);
  },
};
