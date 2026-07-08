// Server-only scores/sessions data access (Postgres via pg).

import type { LeaderboardEntry, Score, Session, User, ProfileStats } from "@/types";
import { query, queryOne } from "@/lib/db/server";

interface UserCols {
  name: string;
  username: string | null;
  avatar_color: string;
  level: number;
  xp: number;
  created_at: string;
}

interface ScoreJoinRow {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  achieved_at: string;
  name: string;
  username: string | null;
  avatar_color: string;
  level: number;
  xp: number;
  user_created_at: string;
}

interface RawScoreRow {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  achieved_at: string;
}

interface SessionRow {
  id: string;
  game_id: string;
  user_id: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
}

function colsToUser(userId: string, u: UserCols): User {
  return {
    id: userId,
    username: u.username ?? u.name.toLowerCase().replace(/\s+/g, "-"),
    displayName: u.name,
    email: "",
    avatarColor: u.avatar_color ?? "from-fuchsia-500 to-purple-600",
    level: u.level ?? 1,
    xp: u.xp ?? 0,
    joinedAt: u.created_at,
  };
}

function rowToScore(r: RawScoreRow): Score {
  return {
    id: r.id,
    gameId: r.game_id,
    userId: r.user_id,
    score: Number(r.score),
    achievedAt: r.achieved_at,
  };
}

function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    userId: r.user_id,
    gameId: r.game_id,
    startedAt: r.started_at,
    endedAt: r.ended_at ?? undefined,
    status: r.status,
    players: [r.user_id],
  };
}

export async function listLeaderboardForGame(
  gameId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const data = await query<ScoreJoinRow>(
    `SELECT s.id, s.game_id, s.user_id, s.score, s.achieved_at,
            u.name, u.username, u.avatar_color, u.level, u.xp,
            u.created_at AS user_created_at
     FROM public.scores s
     INNER JOIN public.users u ON u.id = s.user_id
     WHERE s.game_id = $1
     ORDER BY s.score DESC
     LIMIT $2`,
    [gameId, limit * 5],
  );

  const best = new Map<string, ScoreJoinRow>();
  for (const row of data) {
    const prev = best.get(row.user_id);
    if (!prev || Number(row.score) > Number(prev.score)) best.set(row.user_id, row);
  }

  return Array.from(best.values())
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit)
    .map((row, i) => ({
      rank: i + 1,
      user: colsToUser(row.user_id, {
        name: row.name,
        username: row.username,
        avatar_color: row.avatar_color,
        level: row.level,
        xp: row.xp,
        created_at: row.user_created_at,
      }),
      score: Number(row.score),
      gameId: row.game_id,
    }));
}

export async function listGlobalLeaderboard(
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const data = await query<ScoreJoinRow>(
    `SELECT s.game_id, s.user_id, s.score,
            u.name, u.username, u.avatar_color, u.level, u.xp,
            u.created_at AS user_created_at
     FROM public.scores s
     INNER JOIN public.users u ON u.id = s.user_id
     ORDER BY s.score DESC
     LIMIT 2000`,
  );

  const best = new Map<
    string,
    { score: number; gameId: string; user: UserCols }
  >();
  for (const row of data) {
    const prev = best.get(row.user_id);
    const score = Number(row.score);
    if (!prev || score > prev.score) {
      best.set(row.user_id, {
        score,
        gameId: row.game_id,
        user: {
          name: row.name,
          username: row.username,
          avatar_color: row.avatar_color,
          level: row.level,
          xp: row.xp,
          created_at: row.user_created_at,
        },
      });
    }
  }

  return Array.from(best.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([userId, entry], i) => ({
      rank: i + 1,
      user: colsToUser(userId, entry.user),
      score: entry.score,
      gameId: entry.gameId,
    }));
}

export async function getUserStats(userId: string): Promise<ProfileStats> {
  const [scores, sessions] = await Promise.all([
    query<RawScoreRow>(
      `SELECT id, game_id, user_id, score, achieved_at
       FROM public.scores
       WHERE user_id = $1
       ORDER BY achieved_at DESC
       LIMIT 50`,
      [userId],
    ),
    query<SessionRow>(
      `SELECT id, game_id, user_id, status, started_at, ended_at
       FROM public.game_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 10`,
      [userId],
    ),
  ]);

  const mappedScores = scores.map(rowToScore);
  const mappedSessions = sessions.map(rowToSession);
  const gamesPlayed = new Set(mappedScores.map((s) => s.gameId)).size;
  const bestScore = mappedScores.reduce((max, s) => Math.max(max, s.score), 0);

  return {
    gamesPlayed,
    totalSessions: mappedSessions.length,
    bestScore,
    recentScores: mappedScores.slice(0, 6),
    recentSessions: mappedSessions.slice(0, 4),
  };
}

export async function submitScore(
  userId: string,
  gameId: string,
  score: number,
): Promise<Score> {
  const row = await queryOne<RawScoreRow>(
    `INSERT INTO public.scores (game_id, user_id, score)
     VALUES ($1, $2, $3)
     RETURNING id, game_id, user_id, score, achieved_at`,
    [gameId, userId, score],
  );
  if (!row) throw new Error("[db] submitScore: no row returned");
  return rowToScore(row);
}
