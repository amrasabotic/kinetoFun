// Server-only admin data access (Supabase). Users management + analytics.
// Guarded by getAdminUser()/getSuperAdminUser() in the route handlers.

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  level: number;
  xp: number;
  createdAt: string;
  active: boolean;
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin" | null;
  level: number | null;
  xp: number | null;
  created_at: string;
  active: boolean | null;
}

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role ?? "user",
    level: row.level ?? 1,
    xp: row.xp ?? 0,
    createdAt: row.created_at,
    active: row.active ?? true,
  };
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, email, name, role, level, xp, created_at, active")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[supabase] listAllUsers: ${error.message}`);
  return (data as AdminUserRow[]).map(toAdminUser);
}

export async function setUserActive(id: string, active: boolean): Promise<AdminUser> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update({ active })
    .eq("id", id)
    .select("id, email, name, role, level, xp, created_at, active")
    .single();
  if (error) throw new Error(`[supabase] setUserActive: ${error.message}`);
  return toAdminUser(data as AdminUserRow);
}

export async function updateUserRole(
  id: string,
  role: "user" | "admin" | "superadmin",
): Promise<AdminUser> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update({ role })
    .eq("id", id)
    .select("id, email, name, role, level, xp, created_at, active")
    .single();
  if (error) throw new Error(`[supabase] updateUserRole: ${error.message}`);
  return toAdminUser(data as AdminUserRow);
}

export async function deleteUser(id: string): Promise<void> {
  // Cascades to scores, game_sessions, auth_sessions (FK on delete cascade).
  const { error } = await getSupabaseAdmin().from("users").delete().eq("id", id);
  if (error) throw new Error(`[supabase] deleteUser: ${error.message}`);
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface DayPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  value: number;
}

export interface TopGame {
  gameId: string;
  title: string;
  /** Total recorded plays (from games.play_count). */
  playCount: number;
  category: string;
  coverImage?: string;
  cover?: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  newUsersLast7Days: number;
  totalSessions: number;
  activeSessionsNow: number;
  totalScores: number;
  // SuperAdmin expansion metrics:
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  featuredGames: number;
  totalCategories: number;
  activeCategories: number;
  gamesPlayedToday: number;
  /** Daily new-user counts for the last 14 days. */
  userGrowth: DayPoint[];
  /** Daily play-session counts for the last 14 days. */
  playsPerDay: DayPoint[];
  topGames: TopGame[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a zero-filled array of the last `days` ISO dates (oldest → newest). */
function emptyDaySeries(days: number): { keys: string[]; map: Map<string, number> } {
  const keys: string[] = [];
  const map = new Map<string, number>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    map.set(key, 0);
  }
  return { keys, map };
}

export function bucketByDay(timestamps: string[], days: number): DayPoint[] {
  const { keys, map } = emptyDaySeries(days);
  for (const ts of timestamps) {
    const key = ts.slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, value: map.get(date) ?? 0 }));
}

export async function getAnalytics(): Promise<AdminAnalytics> {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();
  const head = { count: "exact" as const, head: true };

  const [
    totalUsers,
    newUsersLast7Days,
    totalSessions,
    activeSessionsNow,
    totalScores,
    totalGames,
    publishedGames,
    draftGames,
    featuredGames,
    totalCategories,
    activeCategories,
    usersRecent,
    sessionsRecent,
    topGamesRows,
  ] = await Promise.all([
    db.from("users").select("*", head),
    db.from("users").select("*", head).gte("created_at", sevenDaysAgo),
    db.from("game_sessions").select("*", head),
    db.from("game_sessions").select("*", head).eq("status", "active"),
    db.from("scores").select("*", head),
    db.from("games").select("*", head),
    db.from("games").select("*", head).eq("status", "published"),
    db.from("games").select("*", head).eq("status", "draft"),
    db.from("games").select("*", head).eq("featured", true),
    db.from("categories").select("*", head),
    db.from("categories").select("*", head).eq("is_active", true),
    db.from("users").select("created_at").gte("created_at", fourteenDaysAgo).limit(5000),
    db
      .from("game_sessions")
      .select("started_at")
      .gte("started_at", fourteenDaysAgo)
      .limit(10000),
    db
      .from("games")
      .select("id, title, category, cover, cover_image, play_count")
      .order("play_count", { ascending: false })
      .limit(5),
  ]);

  const firstError =
    totalUsers.error ??
    newUsersLast7Days.error ??
    totalSessions.error ??
    activeSessionsNow.error ??
    totalScores.error ??
    totalGames.error ??
    publishedGames.error ??
    draftGames.error ??
    featuredGames.error ??
    totalCategories.error ??
    activeCategories.error ??
    usersRecent.error ??
    sessionsRecent.error ??
    topGamesRows.error;
  if (firstError) throw new Error(`[supabase] getAnalytics: ${firstError.message}`);

  const sessionTimes = ((sessionsRecent.data ?? []) as { started_at: string }[]).map(
    (r) => r.started_at,
  );
  const userTimes = ((usersRecent.data ?? []) as { created_at: string }[]).map(
    (r) => r.created_at,
  );

  const gamesPlayedToday = sessionTimes.filter((t) => t >= todayIso).length;

  const topGames: TopGame[] = (
    (topGamesRows.data ?? []) as Array<{
      id: string;
      title: string;
      category: string;
      cover: string | null;
      cover_image: string | null;
      play_count: number | null;
    }>
  )
    .filter((g) => (g.play_count ?? 0) > 0)
    .map((g) => ({
      gameId: g.id,
      title: g.title,
      playCount: g.play_count ?? 0,
      category: g.category,
      coverImage: g.cover_image ?? undefined,
      cover: g.cover ?? undefined,
    }));

  return {
    totalUsers: totalUsers.count ?? 0,
    newUsersLast7Days: newUsersLast7Days.count ?? 0,
    totalSessions: totalSessions.count ?? 0,
    activeSessionsNow: activeSessionsNow.count ?? 0,
    totalScores: totalScores.count ?? 0,
    totalGames: totalGames.count ?? 0,
    publishedGames: publishedGames.count ?? 0,
    draftGames: draftGames.count ?? 0,
    featuredGames: featuredGames.count ?? 0,
    totalCategories: totalCategories.count ?? 0,
    activeCategories: activeCategories.count ?? 0,
    gamesPlayedToday,
    userGrowth: bucketByDay(userTimes, 14),
    playsPerDay: bucketByDay(sessionTimes, 14),
    topGames,
  };
}

// ── Per-game Analytics ────────────────────────────────────────────────────────

export interface GameTopPlayer {
  rank: number;
  userId: string;
  userName: string;
  bestScore: number;
}

export interface GameAnalytics {
  gameId: string;
  gameTitle: string;
  totalSessions: number;
  uniquePlayers: number;
  avgSessionMinutes: number;
  totalScores: number;
  sessionsPerDay: DayPoint[];
  topPlayers: GameTopPlayer[];
  mostActiveDay: string | null;
  peakConcurrent: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getGameAnalytics(gameId: string, days = 30): Promise<GameAnalytics> {
  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const head = { count: "exact" as const, head: true };

  const [game, totalSessions, allPlayers, totalScores, sessionsRecent, topLbRows] =
    await Promise.all([
      db.from("games").select("id, title").eq("id", gameId).single(),
      db.from("game_sessions").select("*", head).eq("game_id", gameId),
      db.from("game_sessions").select("user_id").eq("game_id", gameId).limit(10000),
      db.from("scores").select("*", head).eq("game_id", gameId),
      db
        .from("game_sessions")
        .select("started_at, ended_at, status")
        .eq("game_id", gameId)
        .gte("started_at", since)
        .limit(5000),
      db
        .from("game_leaderboards")
        .select("user_id, best_score, rank")
        .eq("game_id", gameId)
        .order("rank", { ascending: true })
        .limit(10),
    ]);

  if (game.error) throw new Error(`[supabase] getGameAnalytics game: ${game.error.message}`);

  // Unique players
  const uniquePlayers = new Set(
    ((allPlayers.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
  ).size;

  // Avg session duration (ended sessions only)
  const endedSessions = ((sessionsRecent.data ?? []) as {
    started_at: string;
    ended_at: string | null;
    status: string;
  }[]).filter((s) => s.ended_at && s.status === "ended");

  let avgSessionMinutes = 0;
  if (endedSessions.length > 0) {
    const totalMs = endedSessions.reduce((sum, s) => {
      return sum + (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime());
    }, 0);
    avgSessionMinutes = Math.round((totalMs / endedSessions.length / 60000) * 10) / 10;
  }

  // Sessions per day chart
  const sessionTimes = ((sessionsRecent.data ?? []) as { started_at: string }[]).map(
    (r) => r.started_at,
  );
  const sessionsPerDay = bucketByDay(sessionTimes, days);

  // Most active weekday
  const weekdayCount = new Array(7).fill(0) as number[];
  for (const t of sessionTimes) {
    weekdayCount[new Date(t).getDay()]++;
  }
  const maxCount = Math.max(...weekdayCount);
  const mostActiveDay = maxCount > 0 ? (WEEKDAYS[weekdayCount.indexOf(maxCount)] ?? null) : null;

  // Peak concurrent (sweep-line over sessions in window)
  type Event = { t: number; d: 1 | -1 };
  const events: Event[] = [];
  for (const s of (sessionsRecent.data ?? []) as { started_at: string; ended_at: string | null }[]) {
    events.push({ t: new Date(s.started_at).getTime(), d: 1 });
    if (s.ended_at) events.push({ t: new Date(s.ended_at).getTime(), d: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.d - b.d);
  let concurrent = 0;
  let peakConcurrent = 0;
  for (const e of events) {
    concurrent += e.d;
    if (concurrent > peakConcurrent) peakConcurrent = concurrent;
  }

  // Top players — fetch user names
  const lbRows = (topLbRows.data ?? []) as { user_id: string; best_score: number; rank: number }[];
  let topPlayers: GameTopPlayer[] = [];
  if (lbRows.length > 0) {
    const userIds = lbRows.map((r) => r.user_id);
    const { data: userRows } = await db
      .from("users")
      .select("id, name")
      .in("id", userIds);
    const nameMap = new Map(
      ((userRows ?? []) as { id: string; name: string }[]).map((u) => [u.id, u.name]),
    );
    topPlayers = lbRows.map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      userName: nameMap.get(r.user_id) ?? "Unknown",
      bestScore: r.best_score,
    }));
  }

  return {
    gameId,
    gameTitle: (game.data as { id: string; title: string }).title,
    totalSessions: totalSessions.count ?? 0,
    uniquePlayers,
    avgSessionMinutes,
    totalScores: totalScores.count ?? 0,
    sessionsPerDay,
    topPlayers,
    mostActiveDay,
    peakConcurrent,
  };
}

// ── Leaderboard Moderation ────────────────────────────────────────────────────

export interface LeaderboardPlayer {
  userId: string;
  userName: string;
  userEmail: string;
  bestScore: number;
  bestScoreId: string;
  totalSubmissions: number;
  lastPlayed: string;
  rank: number;
}

export interface ScoreEntry {
  id: string;
  score: number;
  achievedAt: string;
}

export interface LeaderboardPage {
  players: LeaderboardPlayer[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getAdminLeaderboard(
  gameId: string,
  page: number,
  limit: number,
): Promise<LeaderboardPage> {
  const db = getSupabaseAdmin();
  const offset = (page - 1) * limit;
  const head = { count: "exact" as const, head: true };

  const [countRes, lbRes] = await Promise.all([
    db.from("game_leaderboards").select("*", head).eq("game_id", gameId),
    db
      .from("game_leaderboards")
      .select("user_id, best_score, rank")
      .eq("game_id", gameId)
      .order("rank", { ascending: true })
      .range(offset, offset + limit - 1),
  ]);

  if (lbRes.error) throw new Error(`[supabase] getAdminLeaderboard: ${lbRes.error.message}`);

  const lbRows = (lbRes.data ?? []) as { user_id: string; best_score: number; rank: number }[];
  const total = countRes.count ?? 0;

  if (lbRows.length === 0) {
    return { players: [], total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  const userIds = lbRows.map((r) => r.user_id);

  const [userRes, scoreRes] = await Promise.all([
    db.from("users").select("id, name, email").in("id", userIds),
    db
      .from("scores")
      .select("id, user_id, score, achieved_at")
      .eq("game_id", gameId)
      .in("user_id", userIds),
  ]);

  const userMap = new Map(
    ((userRes.data ?? []) as { id: string; name: string; email: string }[]).map((u) => [
      u.id,
      { name: u.name, email: u.email },
    ]),
  );

  // Group scores by user_id
  const scoresByUser = new Map<string, { id: string; score: number; achieved_at: string }[]>();
  for (const s of (scoreRes.data ?? []) as { id: string; user_id: string; score: number; achieved_at: string }[]) {
    const arr = scoresByUser.get(s.user_id) ?? [];
    arr.push(s);
    scoresByUser.set(s.user_id, arr);
  }

  const players: LeaderboardPlayer[] = lbRows.map((r) => {
    const user = userMap.get(r.user_id);
    const userScores = scoresByUser.get(r.user_id) ?? [];
    const bestScoreRow = userScores.find((s) => s.score === r.best_score) ?? userScores[0];
    const lastPlayed =
      userScores.reduce(
        (max, s) => (s.achieved_at > max ? s.achieved_at : max),
        userScores[0]?.achieved_at ?? "",
      );
    return {
      rank: r.rank,
      userId: r.user_id,
      userName: user?.name ?? "Unknown",
      userEmail: user?.email ?? "",
      bestScore: r.best_score,
      bestScoreId: bestScoreRow?.id ?? "",
      totalSubmissions: userScores.length,
      lastPlayed,
    };
  });

  return { players, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getScoresByUserGame(
  gameId: string,
  userId: string,
): Promise<ScoreEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("scores")
    .select("id, score, achieved_at")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });
  if (error) throw new Error(`[supabase] getScoresByUserGame: ${error.message}`);
  return ((data ?? []) as { id: string; score: number; achieved_at: string }[]).map((s) => ({
    id: s.id,
    score: s.score,
    achievedAt: s.achieved_at,
  }));
}

export async function deleteScore(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("scores").delete().eq("id", id);
  if (error) throw new Error(`[supabase] deleteScore: ${error.message}`);
}

export async function deleteAllScoresForGame(gameId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("scores").delete().eq("game_id", gameId);
  if (error) throw new Error(`[supabase] deleteAllScoresForGame: ${error.message}`);
}
