import { games, scores, sessions, users } from "@/mock";
import type { Game, Score, Session, User } from "@/types";

export interface ProfileStats {
  gamesPlayed: number;
  totalSessions: number;
  bestScore: number;
  recentScores: Array<Score & { game?: Game }>;
  recentSessions: Array<Session & { game?: Game }>;
}

// Aggregates a single user's activity from the mock data sources.
export const profileService = {
  getUser(userId: string): User | undefined {
    return users.find((u) => u.id === userId);
  },

  getStats(userId: string): ProfileStats {
    const userScores = scores
      .filter((s) => s.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime(),
      );

    const userSessions = sessions
      .filter((s) => s.players.includes(userId))
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

    const gamesPlayed = new Set(userScores.map((s) => s.gameId)).size;
    const bestScore = userScores.reduce((max, s) => Math.max(max, s.score), 0);

    const withGame = <T extends { gameId: string }>(item: T) => ({
      ...item,
      game: games.find((g) => g.id === item.gameId),
    });

    return {
      gamesPlayed,
      totalSessions: userSessions.length,
      bestScore,
      recentScores: userScores.slice(0, 6).map(withGame),
      recentSessions: userSessions.slice(0, 4).map(withGame),
    };
  },
};
