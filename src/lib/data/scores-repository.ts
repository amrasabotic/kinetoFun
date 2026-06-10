// Server-only scores/sessions data access (Supabase).
// Mirrors the pattern in games-repository.ts.

import type { LeaderboardEntry, Score, Session, User } from "@/types";
import type { ProfileStats } from "@/services/profile.service";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// ── DB row shapes ────────────────────────────────────────────────────────────

interface UserCols {
  name: string;
  username: string | null;
  avatar_color: string;
  level: number;
  xp: number;
  created_at: string;
}

interface ScoreRow {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  achieved_at: string;
  users: UserCols;
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

// ── Mappers ──────────────────────────────────────────────────────────────────

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
    score: r.score,
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

// ── Leaderboard queries ──────────────────────────────────────────────────────

export async function listLeaderboardForGame(
  gameId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("scores")
    .select(
      "id, game_id, user_id, score, achieved_at, users!inner(name, username, avatar_color, level, xp, created_at)",
    )
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit * 5);

  if (error) throw new Error(`[supabase] listLeaderboardForGame: ${error.message}`);

  // Keep only best score per user then re-rank
  const best = new Map<string, ScoreRow>();
  for (const row of (data ?? []) as unknown as ScoreRow[]) {
    const prev = best.get(row.user_id);
    if (!prev || row.score > prev.score) best.set(row.user_id, row);
  }

  return Array.from(best.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row, i) => ({
      rank: i + 1,
      user: colsToUser(row.user_id, row.users),
      score: row.score,
      gameId: row.game_id,
    }));
}

export async function listGlobalLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("scores")
    .select(
      "game_id, user_id, score, users!inner(name, username, avatar_color, level, xp, created_at)",
    )
    .order("score", { ascending: false })
    .limit(2000);

  if (error) throw new Error(`[supabase] listGlobalLeaderboard: ${error.message}`);

  // Best single score per user across all games
  const best = new Map<string, { score: number; gameId: string; user: UserCols }>();
  for (const row of (data ?? []) as unknown as ScoreRow[]) {
    const prev = best.get(row.user_id);
    if (!prev || row.score > prev.score) {
      best.set(row.user_id, { score: row.score, gameId: row.game_id, user: row.users });
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

// ── Profile stats ────────────────────────────────────────────────────────────

export async function getUserStats(userId: string): Promise<ProfileStats> {
  const [scoresRes, sessionsRes] = await Promise.all([
    getSupabaseAdmin()
      .from("scores")
      .select("id, game_id, user_id, score, achieved_at")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false })
      .limit(50),
    getSupabaseAdmin()
      .from("game_sessions")
      .select("id, game_id, user_id, status, started_at, ended_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  if (scoresRes.error) throw new Error(`[supabase] getUserStats scores: ${scoresRes.error.message}`);
  if (sessionsRes.error) throw new Error(`[supabase] getUserStats sessions: ${sessionsRes.error.message}`);

  const scores = ((scoresRes.data ?? []) as RawScoreRow[]).map(rowToScore);
  const sessions = ((sessionsRes.data ?? []) as SessionRow[]).map(rowToSession);

  const gamesPlayed = new Set(scores.map((s) => s.gameId)).size;
  const bestScore = scores.reduce((max, s) => Math.max(max, s.score), 0);

  return {
    gamesPlayed,
    totalSessions: sessions.length,
    bestScore,
    recentScores: scores.slice(0, 6),
    recentSessions: sessions.slice(0, 4),
  };
}

// ── Score submission ─────────────────────────────────────────────────────────

export async function submitScore(
  userId: string,
  gameId: string,
  score: number,
): Promise<Score> {
  const { data, error } = await getSupabaseAdmin()
    .from("scores")
    .insert({ game_id: gameId, user_id: userId, score })
    .select("id, game_id, user_id, score, achieved_at")
    .single();

  if (error) throw new Error(`[supabase] submitScore: ${error.message}`);
  return rowToScore(data as RawScoreRow);
}
