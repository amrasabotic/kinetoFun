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
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin" | null;
  level: number | null;
  xp: number | null;
  created_at: string;
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
  };
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, email, name, role, level, xp, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[supabase] listAllUsers: ${error.message}`);
  return (data as AdminUserRow[]).map(toAdminUser);
}

export async function updateUserRole(
  id: string,
  role: "user" | "admin" | "superadmin",
): Promise<AdminUser> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update({ role })
    .eq("id", id)
    .select("id, email, name, role, level, xp, created_at")
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

export interface AdminAnalytics {
  totalUsers: number;
  newUsersLast7Days: number;
  totalSessions: number;
  activeSessionsNow: number;
  totalScores: number;
  topGames: Array<{ gameId: string; title: string; sessionCount: number }>;
}

export async function getAnalytics(): Promise<AdminAnalytics> {
  const db = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [
    totalUsers,
    newUsersLast7Days,
    totalSessions,
    activeSessionsNow,
    totalScores,
    sessionsForTop,
    games,
  ] = await Promise.all([
    db.from("users").select("*", head),
    db.from("users").select("*", head).gte("created_at", sevenDaysAgo),
    db.from("game_sessions").select("*", head),
    db.from("game_sessions").select("*", head).eq("status", "active"),
    db.from("scores").select("*", head),
    db.from("game_sessions").select("game_id").limit(5000),
    db.from("games").select("id, title"),
  ]);

  const firstError =
    totalUsers.error ??
    newUsersLast7Days.error ??
    totalSessions.error ??
    activeSessionsNow.error ??
    totalScores.error ??
    sessionsForTop.error ??
    games.error;
  if (firstError) throw new Error(`[supabase] getAnalytics: ${firstError.message}`);

  // Count sessions per game, then attach titles, top 5.
  const counts = new Map<string, number>();
  for (const row of (sessionsForTop.data ?? []) as { game_id: string }[]) {
    counts.set(row.game_id, (counts.get(row.game_id) ?? 0) + 1);
  }
  const titles = new Map(
    ((games.data ?? []) as { id: string; title: string }[]).map((g) => [g.id, g.title]),
  );
  const topGames = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gameId, sessionCount]) => ({
      gameId,
      title: titles.get(gameId) ?? gameId,
      sessionCount,
    }));

  return {
    totalUsers: totalUsers.count ?? 0,
    newUsersLast7Days: newUsersLast7Days.count ?? 0,
    totalSessions: totalSessions.count ?? 0,
    activeSessionsNow: activeSessionsNow.count ?? 0,
    totalScores: totalScores.count ?? 0,
    topGames,
  };
}
