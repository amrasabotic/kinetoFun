// Server-only reward logic: pays tickets, updates streaks and grants badges.
//
// Every award for one finished game runs in a single transaction that first
// locks the user row, so concurrent submissions for the same player are
// serialised and the cached users.tickets balance always matches the ledger.

import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "@/lib/db/server";
import {
  BADGES,
  MAX_REWARDED_GAMES_PER_DAY,
  MIN_SESSION_SECONDS,
  NEW_GAME_BONUS,
  PERSONAL_BEST_BONUS,
  REASON_LABELS,
  STREAK_BONUS_CAP_DAYS,
  STREAK_TICKETS_PER_DAY,
  TICKETS_PER_GAME,
  toBadgeSummary,
  type BadgeStats,
  type BadgeSummary,
  type GameRewardResult,
  type RewardLine,
  type RewardReason,
  type RewardsOverview,
} from "./catalog";

/** Why a finished game earned nothing. */
export type IneligibleReason =
  | "session_not_found"
  | "session_too_short"
  | "already_rewarded";

export type AwardOutcome =
  | { eligible: true; result: GameRewardResult }
  | { eligible: false; reason: IneligibleReason };

// Streak days and the daily limit use UTC calendar days so the result does not
// depend on the database server's time zone setting.
const UTC_TODAY = `(now() at time zone 'utc')::date`;

async function credit(
  client: PoolClient,
  userId: string,
  reason: RewardReason,
  delta: number,
  opts: { gameId?: string; sessionId?: string; ref?: string } = {},
): Promise<boolean> {
  const inserted = await client.query(
    `INSERT INTO public.reward_ledger (user_id, delta, reason, game_id, session_id, ref)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, delta, reason, opts.gameId ?? null, opts.sessionId ?? null, opts.ref ?? null],
  );
  if (inserted.rowCount === 0) return false;
  if (delta !== 0) {
    await client.query(
      `UPDATE public.users SET tickets = tickets + $1 WHERE id = $2`,
      [delta, userId],
    );
  }
  return true;
}

async function updateStreak(
  client: PoolClient,
  userId: string,
): Promise<{ current: number; best: number; extendedToday: boolean; today: string }> {
  const { rows } = await client.query<{
    current_streak: number | null;
    best_streak: number | null;
    last_play: string | null;
    today: string;
    yesterday: string;
  }>(
    `SELECT s.current_streak, s.best_streak,
            to_char(s.last_play_date, 'YYYY-MM-DD') AS last_play,
            to_char(${UTC_TODAY}, 'YYYY-MM-DD') AS today,
            to_char(${UTC_TODAY} - 1, 'YYYY-MM-DD') AS yesterday
     FROM (SELECT 1) AS one
     LEFT JOIN public.user_streaks s ON s.user_id = $1`,
    [userId],
  );
  const row = rows[0];
  const prevCurrent = row.current_streak ?? 0;
  const prevBest = row.best_streak ?? 0;

  if (row.last_play === row.today) {
    return { current: prevCurrent, best: prevBest, extendedToday: false, today: row.today };
  }

  const current = row.last_play === row.yesterday ? prevCurrent + 1 : 1;
  const best = Math.max(prevBest, current);
  await client.query(
    `INSERT INTO public.user_streaks (user_id, current_streak, best_streak, last_play_date)
     VALUES ($1, $2, $3, ${UTC_TODAY})
     ON CONFLICT (user_id) DO UPDATE
       SET current_streak = excluded.current_streak,
           best_streak    = excluded.best_streak,
           last_play_date = excluded.last_play_date`,
    [userId, current, best],
  );
  return { current, best, extendedToday: true, today: row.today };
}

async function loadBadgeStats(
  client: PoolClient,
  userId: string,
  bestStreak: number,
): Promise<BadgeStats> {
  const totals = await client.query<{ finished: string; distinct_games: string; bests: string }>(
    `SELECT count(*) FILTER (WHERE reason = 'game_complete')                   AS finished,
            count(DISTINCT game_id) FILTER (WHERE reason = 'game_complete')    AS distinct_games,
            count(*) FILTER (WHERE reason = 'personal_best')                   AS bests
     FROM public.reward_ledger WHERE user_id = $1`,
    [userId],
  );
  const perCategory = await client.query<{ category: string; finished: string; distinct_games: string }>(
    `SELECT g.category::text AS category,
            count(*) AS finished,
            count(DISTINCT l.game_id) AS distinct_games
     FROM public.reward_ledger l
     JOIN public.games g ON g.id = l.game_id
     WHERE l.user_id = $1 AND l.reason = 'game_complete'
     GROUP BY g.category`,
    [userId],
  );
  const cats = await client.query<{ n: string }>(
    `SELECT count(DISTINCT category) AS n FROM public.games WHERE status = 'published'`,
  );

  const categories: BadgeStats["categories"] = {};
  for (const r of perCategory.rows) {
    categories[r.category] = { finished: Number(r.finished), distinct: Number(r.distinct_games) };
  }
  const t = totals.rows[0];
  return {
    gamesFinished: Number(t.finished),
    distinctGames: Number(t.distinct_games),
    personalBests: Number(t.bests),
    bestStreak,
    categories,
    totalCategories: Number(cats.rows[0]?.n ?? 0),
  };
}

/**
 * Award tickets, streak progress and badges for one finished game.
 *
 * `scoreId` is the score row just inserted for this game, so it can be left
 * out when comparing against the player's previous best.
 */
export async function awardForCompletedGame(input: {
  userId: string;
  gameId: string;
  sessionId: string;
  scoreId: string;
  score: number;
}): Promise<AwardOutcome> {
  const { userId, gameId, sessionId, scoreId, score } = input;

  return withTransaction<AwardOutcome>(async (client) => {
    await client.query(`SELECT 1 FROM public.users WHERE id = $1 FOR UPDATE`, [userId]);

    const session = await client.query<{ age_seconds: number }>(
      `SELECT extract(epoch FROM now() - started_at)::float8 AS age_seconds
       FROM public.game_sessions
       WHERE id = $1 AND user_id = $2 AND game_id = $3`,
      [sessionId, userId, gameId],
    );
    if (session.rowCount === 0) return { eligible: false, reason: "session_not_found" };
    if (session.rows[0].age_seconds < MIN_SESSION_SECONDS) {
      return { eligible: false, reason: "session_too_short" };
    }

    const today = await client.query<{ n: string }>(
      `SELECT count(*) AS n FROM public.reward_ledger
       WHERE user_id = $1 AND reason = 'game_complete' AND delta > 0
         AND (created_at at time zone 'utc')::date = ${UTC_TODAY}`,
      [userId],
    );
    const dailyLimitReached = Number(today.rows[0].n) >= MAX_REWARDED_GAMES_PER_DAY;

    // The game_complete row doubles as the "this session was rewarded" marker,
    // so it is written (with 0 tickets) even when the daily limit is reached.
    const lines: RewardLine[] = [];
    const firstPayout = await credit(
      client, userId, "game_complete", dailyLimitReached ? 0 : TICKETS_PER_GAME,
      { gameId, sessionId },
    );
    if (!firstPayout) return { eligible: false, reason: "already_rewarded" };
    if (!dailyLimitReached) {
      lines.push({ reason: "game_complete", label: REASON_LABELS.game_complete, amount: TICKETS_PER_GAME });

      const prior = await client.query<{ best: string | null; plays: string }>(
        `SELECT max(score) AS best, count(*) AS plays FROM public.scores
         WHERE user_id = $1 AND game_id = $2 AND id <> $3`,
        [userId, gameId, scoreId],
      );
      const plays = Number(prior.rows[0].plays);
      const best = prior.rows[0].best === null ? null : Number(prior.rows[0].best);

      if (plays === 0) {
        if (await credit(client, userId, "new_game", NEW_GAME_BONUS, { gameId, sessionId })) {
          lines.push({ reason: "new_game", label: REASON_LABELS.new_game, amount: NEW_GAME_BONUS });
        }
      } else if (best !== null && score > best) {
        if (await credit(client, userId, "personal_best", PERSONAL_BEST_BONUS, { gameId, sessionId })) {
          lines.push({ reason: "personal_best", label: REASON_LABELS.personal_best, amount: PERSONAL_BEST_BONUS });
        }
      }
    }

    const streak = await updateStreak(client, userId);
    if (streak.extendedToday) {
      const bonus = Math.min(streak.current, STREAK_BONUS_CAP_DAYS) * STREAK_TICKETS_PER_DAY;
      if (await credit(client, userId, "daily_streak", bonus, { ref: `day:${streak.today}` })) {
        lines.push({
          reason: "daily_streak",
          label: `${REASON_LABELS.daily_streak} (${streak.current} day${streak.current === 1 ? "" : "s"})`,
          amount: bonus,
        });
      }
    }

    const owned = await client.query<{ badge_id: string }>(
      `SELECT badge_id FROM public.user_badges WHERE user_id = $1`,
      [userId],
    );
    const ownedIds = new Set(owned.rows.map((r) => r.badge_id));
    const stats = await loadBadgeStats(client, userId, streak.best);
    const newBadges: BadgeSummary[] = [];
    for (const badge of BADGES) {
      if (ownedIds.has(badge.id) || !badge.earned(stats)) continue;
      const granted = await client.query(
        `INSERT INTO public.user_badges (user_id, badge_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING badge_id`,
        [userId, badge.id],
      );
      if (granted.rowCount === 0) continue;
      newBadges.push(toBadgeSummary(badge));
      if (await credit(client, userId, "badge", badge.tickets, { ref: badge.id })) {
        lines.push({ reason: "badge", label: `Badge: ${badge.title}`, amount: badge.tickets });
      }
    }

    const balance = await client.query<{ tickets: number }>(
      `SELECT tickets FROM public.users WHERE id = $1`,
      [userId],
    );

    return {
      eligible: true,
      result: {
        ticketsEarned: lines.reduce((sum, l) => sum + l.amount, 0),
        lines,
        newBadges,
        streak: { current: streak.current, best: streak.best },
        balance: balance.rows[0]?.tickets ?? 0,
        dailyLimitReached,
      },
    };
  });
}

/** Balance, streak, badge collection and recent ticket history for the profile. */
export async function getRewardsOverview(userId: string): Promise<RewardsOverview> {
  const [user, streak, today, badges, recent] = await Promise.all([
    queryOne<{ tickets: number }>(`SELECT tickets FROM public.users WHERE id = $1`, [userId]),
    queryOne<{ current_streak: number; best_streak: number; days_since: number | null }>(
      `SELECT current_streak, best_streak, (${UTC_TODAY} - last_play_date) AS days_since
       FROM public.user_streaks WHERE user_id = $1`,
      [userId],
    ),
    queryOne<{ n: string }>(
      `SELECT count(*) AS n FROM public.reward_ledger
       WHERE user_id = $1 AND reason = 'game_complete' AND delta > 0
         AND (created_at at time zone 'utc')::date = ${UTC_TODAY}`,
      [userId],
    ),
    query<{ badge_id: string; earned_at: string }>(
      `SELECT badge_id, earned_at FROM public.user_badges WHERE user_id = $1`,
      [userId],
    ),
    query<{ id: string; delta: number; reason: RewardReason; ref: string | null; game_id: string | null; created_at: string }>(
      `SELECT id, delta, reason, ref, game_id, created_at FROM public.reward_ledger
       WHERE user_id = $1 AND delta <> 0
       ORDER BY created_at DESC LIMIT 12`,
      [userId],
    ),
  ]);

  const earnedAt = new Map(badges.map((b) => [b.badge_id, b.earned_at]));
  const titleById = new Map(BADGES.map((b) => [b.id, b.title]));
  const daysSince = streak?.days_since ?? null;

  return {
    balance: user?.tickets ?? 0,
    streak: {
      // A streak survives until the end of the day after the last play.
      current: daysSince !== null && daysSince <= 1 ? streak!.current_streak : 0,
      best: streak?.best_streak ?? 0,
      playedToday: daysSince === 0,
    },
    rewardedGamesToday: Number(today?.n ?? 0),
    maxRewardedGamesPerDay: MAX_REWARDED_GAMES_PER_DAY,
    badges: BADGES.map((b) => ({ ...toBadgeSummary(b), earnedAt: earnedAt.get(b.id) ?? null })),
    recent: recent.map((r) => ({
      id: r.id,
      delta: r.delta,
      label:
        r.reason === "badge" && r.ref
          ? `Badge: ${titleById.get(r.ref) ?? r.ref}`
          : REASON_LABELS[r.reason] ?? r.reason,
      gameId: r.game_id,
      createdAt: r.created_at,
    })),
  };
}
