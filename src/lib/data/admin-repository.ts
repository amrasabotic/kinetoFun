// Server-only admin data access (Postgres via pg).

import { execute, query, queryCount, queryOne } from "@/lib/db/server";

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
  const rows = await query<AdminUserRow>(
    `SELECT id, email, name, role, level, xp, created_at, active
     FROM public.users
     ORDER BY created_at DESC`,
  );
  return rows.map(toAdminUser);
}

export async function setUserActive(
  id: string,
  active: boolean,
): Promise<AdminUser> {
  const row = await queryOne<AdminUserRow>(
    `UPDATE public.users SET active = $1 WHERE id = $2
     RETURNING id, email, name, role, level, xp, created_at, active`,
    [active, id],
  );
  if (!row) throw new Error("[db] setUserActive: not found");
  return toAdminUser(row);
}

export async function updateUserRole(
  id: string,
  role: "user" | "admin" | "superadmin",
): Promise<AdminUser> {
  const row = await queryOne<AdminUserRow>(
    `UPDATE public.users SET role = $1 WHERE id = $2
     RETURNING id, email, name, role, level, xp, created_at, active`,
    [role, id],
  );
  if (!row) throw new Error("[db] updateUserRole: not found");
  return toAdminUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await execute(`DELETE FROM public.users WHERE id = $1`, [id]);
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface DayPoint {
  date: string;
  value: number;
}

export interface TopGame {
  gameId: string;
  title: string;
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
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  featuredGames: number;
  totalCategories: number;
  activeCategories: number;
  gamesPlayedToday: number;
  userGrowth: DayPoint[];
  playsPerDay: DayPoint[];
  topGames: TopGame[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyDaySeries(days: number): {
  keys: string[];
  map: Map<string, number>;
} {
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
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

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
    queryCount(`SELECT COUNT(*)::int AS count FROM public.users`),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.users WHERE created_at >= $1`,
      [sevenDaysAgo],
    ),
    queryCount(`SELECT COUNT(*)::int AS count FROM public.game_sessions`),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.game_sessions WHERE status = 'active'`,
    ),
    queryCount(`SELECT COUNT(*)::int AS count FROM public.scores`),
    queryCount(`SELECT COUNT(*)::int AS count FROM public.games`),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.games WHERE status = 'published'`,
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.games WHERE status = 'draft'`,
    ),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.games WHERE featured = true`,
    ),
    queryCount(`SELECT COUNT(*)::int AS count FROM public.categories`),
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.categories WHERE is_active = true`,
    ),
    query<{ created_at: string }>(
      `SELECT created_at FROM public.users WHERE created_at >= $1 LIMIT 5000`,
      [fourteenDaysAgo],
    ),
    query<{ started_at: string }>(
      `SELECT started_at FROM public.game_sessions WHERE started_at >= $1 LIMIT 10000`,
      [fourteenDaysAgo],
    ),
    query<{
      id: string;
      title: string;
      category: string;
      cover: string | null;
      cover_image: string | null;
      play_count: number | null;
    }>(
      `SELECT id, title, category, cover, cover_image, play_count
       FROM public.games
       ORDER BY play_count DESC
       LIMIT 5`,
    ),
  ]);

  const sessionTimes = sessionsRecent.map((r) => r.started_at);
  const userTimes = usersRecent.map((r) => r.created_at);
  const gamesPlayedToday = sessionTimes.filter((t) => t >= todayIso).length;

  const topGames: TopGame[] = topGamesRows
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

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function getGameAnalytics(
  gameId: string,
  days = 30,
): Promise<GameAnalytics> {
  const since = new Date(Date.now() - days * DAY_MS).toISOString();

  const [game, totalSessions, allPlayers, totalScores, sessionsRecent, lbRows] =
    await Promise.all([
      queryOne<{ id: string; title: string }>(
        `SELECT id, title FROM public.games WHERE id = $1`,
        [gameId],
      ),
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.game_sessions WHERE game_id = $1`,
        [gameId],
      ),
      query<{ user_id: string }>(
        `SELECT user_id FROM public.game_sessions WHERE game_id = $1 LIMIT 10000`,
        [gameId],
      ),
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.scores WHERE game_id = $1`,
        [gameId],
      ),
      query<{
        started_at: string;
        ended_at: string | null;
        status: string;
      }>(
        `SELECT started_at, ended_at, status FROM public.game_sessions
         WHERE game_id = $1 AND started_at >= $2
         LIMIT 5000`,
        [gameId, since],
      ),
      query<{ user_id: string; best_score: number; rank: number }>(
        `SELECT user_id, best_score, rank FROM public.game_leaderboards
         WHERE game_id = $1
         ORDER BY rank ASC
         LIMIT 10`,
        [gameId],
      ),
    ]);

  if (!game) throw new Error("[db] getGameAnalytics: game not found");

  const uniquePlayers = new Set(allPlayers.map((r) => r.user_id)).size;

  const endedSessions = sessionsRecent.filter(
    (s) => s.ended_at && s.status === "ended",
  );
  let avgSessionMinutes = 0;
  if (endedSessions.length > 0) {
    const totalMs = endedSessions.reduce((sum, s) => {
      return (
        sum +
        (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime())
      );
    }, 0);
    avgSessionMinutes =
      Math.round((totalMs / endedSessions.length / 60000) * 10) / 10;
  }

  const sessionTimes = sessionsRecent.map((r) => r.started_at);
  const sessionsPerDay = bucketByDay(sessionTimes, days);

  const weekdayCount = new Array(7).fill(0) as number[];
  for (const t of sessionTimes) {
    weekdayCount[new Date(t).getDay()]++;
  }
  const maxCount = Math.max(...weekdayCount);
  const mostActiveDay =
    maxCount > 0 ? (WEEKDAYS[weekdayCount.indexOf(maxCount)] ?? null) : null;

  type Event = { t: number; d: 1 | -1 };
  const events: Event[] = [];
  for (const s of sessionsRecent) {
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

  let topPlayers: GameTopPlayer[] = [];
  if (lbRows.length > 0) {
    const userIds = lbRows.map((r) => r.user_id);
    const userRows = await query<{ id: string; name: string }>(
      `SELECT id, name FROM public.users WHERE id = ANY($1::uuid[])`,
      [userIds],
    );
    const nameMap = new Map(userRows.map((u) => [u.id, u.name]));
    topPlayers = lbRows.map((r) => ({
      rank: Number(r.rank),
      userId: r.user_id,
      userName: nameMap.get(r.user_id) ?? "Unknown",
      bestScore: Number(r.best_score),
    }));
  }

  return {
    gameId,
    gameTitle: game.title,
    totalSessions,
    uniquePlayers,
    avgSessionMinutes,
    totalScores,
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
  const offset = (page - 1) * limit;

  const [total, lbRows] = await Promise.all([
    queryCount(
      `SELECT COUNT(*)::int AS count FROM public.game_leaderboards WHERE game_id = $1`,
      [gameId],
    ),
    query<{ user_id: string; best_score: number; rank: number }>(
      `SELECT user_id, best_score, rank FROM public.game_leaderboards
       WHERE game_id = $1
       ORDER BY rank ASC
       LIMIT $2 OFFSET $3`,
      [gameId, limit, offset],
    ),
  ]);

  if (lbRows.length === 0) {
    return {
      players: [],
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  const userIds = lbRows.map((r) => r.user_id);

  const [userRows, scoreRows] = await Promise.all([
    query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM public.users WHERE id = ANY($1::uuid[])`,
      [userIds],
    ),
    query<{
      id: string;
      user_id: string;
      score: number;
      achieved_at: string;
    }>(
      `SELECT id, user_id, score, achieved_at FROM public.scores
       WHERE game_id = $1 AND user_id = ANY($2::uuid[])`,
      [gameId, userIds],
    ),
  ]);

  const userMap = new Map(
    userRows.map((u) => [u.id, { name: u.name, email: u.email }]),
  );

  const scoresByUser = new Map<
    string,
    { id: string; score: number; achieved_at: string }[]
  >();
  for (const s of scoreRows) {
    const arr = scoresByUser.get(s.user_id) ?? [];
    arr.push(s);
    scoresByUser.set(s.user_id, arr);
  }

  const players: LeaderboardPlayer[] = lbRows.map((r) => {
    const user = userMap.get(r.user_id);
    const userScores = scoresByUser.get(r.user_id) ?? [];
    const bestScoreRow =
      userScores.find((s) => Number(s.score) === Number(r.best_score)) ??
      userScores[0];
    const lastPlayed = userScores.reduce(
      (max, s) => (s.achieved_at > max ? s.achieved_at : max),
      userScores[0]?.achieved_at ?? "",
    );
    return {
      rank: Number(r.rank),
      userId: r.user_id,
      userName: user?.name ?? "Unknown",
      userEmail: user?.email ?? "",
      bestScore: Number(r.best_score),
      bestScoreId: bestScoreRow?.id ?? "",
      totalSubmissions: userScores.length,
      lastPlayed,
    };
  });

  return {
    players,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getScoresByUserGame(
  gameId: string,
  userId: string,
): Promise<ScoreEntry[]> {
  const rows = await query<{ id: string; score: number; achieved_at: string }>(
    `SELECT id, score, achieved_at FROM public.scores
     WHERE game_id = $1 AND user_id = $2
     ORDER BY achieved_at DESC`,
    [gameId, userId],
  );
  return rows.map((s) => ({
    id: s.id,
    score: Number(s.score),
    achievedAt: s.achieved_at,
  }));
}

export async function deleteScore(id: string): Promise<void> {
  await execute(`DELETE FROM public.scores WHERE id = $1`, [id]);
}

export async function deleteAllScoresForGame(gameId: string): Promise<void> {
  await execute(`DELETE FROM public.scores WHERE game_id = $1`, [gameId]);
}
