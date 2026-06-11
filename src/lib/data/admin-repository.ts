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

function bucketByDay(timestamps: string[], days: number): DayPoint[] {
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
