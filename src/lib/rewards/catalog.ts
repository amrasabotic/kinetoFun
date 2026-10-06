// Reward rules and the platform badge catalogue.
//
// Pure data and pure functions only, so this module is safe to import from
// both server and client code. The award logic lives in ./service.ts.

/** Tickets for every finished game (a GAME_COMPLETE from a real session). */
export const TICKETS_PER_GAME = 5;
/** Extra tickets when a score beats the player's previous best in that game. */
export const PERSONAL_BEST_BONUS = 5;
/** Extra tickets the first time a player finishes a game they have never played. */
export const NEW_GAME_BONUS = 3;
/** Daily streak bonus = streak length (capped) × this, paid once per day. */
export const STREAK_TICKETS_PER_DAY = 2;
export const STREAK_BONUS_CAP_DAYS = 7;
/**
 * Finished games that earn tickets per UTC day. Later games still count
 * towards streaks and badges but pay nothing, which caps how fast a single
 * account can farm tickets by replaying a short game.
 */
export const MAX_REWARDED_GAMES_PER_DAY = 20;
/**
 * A session must have run at least this long before it can pay out. Score
 * submission trusts the client, so this stops a script from starting and
 * completing sessions in a tight loop.
 */
export const MIN_SESSION_SECONDS = 15;

export type RewardReason =
  | "game_complete"
  | "personal_best"
  | "new_game"
  | "daily_streak"
  | "badge"
  | "game_achievement"
  | "shop_purchase"
  | "mystery_box"
  | "world_unlock"
  | "admin_adjust";

export const REASON_LABELS: Record<RewardReason, string> = {
  game_complete: "Game finished",
  personal_best: "New personal best",
  new_game: "First time playing",
  daily_streak: "Daily streak bonus",
  badge: "Badge earned",
  game_achievement: "Collectible earned",
  shop_purchase: "Shop purchase",
  mystery_box: "Mystery box",
  world_unlock: "Unlocked a secret world",
  admin_adjust: "Adjustment",
};

/** Aggregates a badge rule is evaluated against. */
export interface BadgeStats {
  gamesFinished: number;
  distinctGames: number;
  personalBests: number;
  bestStreak: number;
  /** In-game achievements collected on the platform. */
  collectibles: number;
  /** Finished games and distinct games, keyed by category name. */
  categories: Record<string, { finished: number; distinct: number }>;
  /** Number of categories that currently have at least one published game. */
  totalCategories: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Tickets paid once, when the badge is earned. */
  tickets: number;
  earned: (s: BadgeStats) => boolean;
}

/** "Skill mastered" badges: sustained play across several games in one category. */
const CATEGORY_MASTERY_GAMES = 15;
const CATEGORY_MASTERY_DISTINCT = 5;

const CATEGORY_BADGES: { category: string; emoji: string }[] = [
  { category: "Action", emoji: "⚡" },
  { category: "Puzzle", emoji: "🧩" },
  { category: "Sports", emoji: "⚽" },
  { category: "Arcade", emoji: "🕹️" },
  { category: "Adventure", emoji: "🧗" },
  { category: "Party", emoji: "🎉" },
];

export const BADGES: BadgeDef[] = [
  { id: "first-game", title: "First Game", description: "Finish your first game.", emoji: "🎮", tickets: 5, earned: (s) => s.gamesFinished >= 1 },
  { id: "games-10", title: "Warming Up", description: "Finish 10 games.", emoji: "🎯", tickets: 10, earned: (s) => s.gamesFinished >= 10 },
  { id: "games-50", title: "Super Player", description: "Finish 50 games.", emoji: "🏃", tickets: 25, earned: (s) => s.gamesFinished >= 50 },
  { id: "games-100", title: "Game Legend", description: "Finish 100 games.", emoji: "🏆", tickets: 50, earned: (s) => s.gamesFinished >= 100 },
  { id: "explorer-10", title: "Explorer", description: "Finish 10 different games.", emoji: "🧭", tickets: 15, earned: (s) => s.distinctGames >= 10 },
  { id: "explorer-25", title: "World Traveler", description: "Finish 25 different games.", emoji: "🗺️", tickets: 30, earned: (s) => s.distinctGames >= 25 },
  {
    id: "all-categories", title: "Try Everything", description: "Finish a game in every category.", emoji: "🌈", tickets: 25,
    earned: (s) => s.totalCategories > 0 && Object.keys(s.categories).length >= s.totalCategories,
  },
  { id: "best-1", title: "New Record", description: "Beat your own best score.", emoji: "⭐", tickets: 5, earned: (s) => s.personalBests >= 1 },
  { id: "best-10", title: "Record Breaker", description: "Beat your own best score 10 times.", emoji: "🌟", tickets: 20, earned: (s) => s.personalBests >= 10 },
  { id: "streak-3", title: "On a Roll", description: "Play 3 days in a row.", emoji: "🔥", tickets: 10, earned: (s) => s.bestStreak >= 3 },
  { id: "streak-7", title: "Week Streak", description: "Play 7 days in a row.", emoji: "📅", tickets: 25, earned: (s) => s.bestStreak >= 7 },
  { id: "collector-10", title: "Collector", description: "Collect 10 in-game achievements.", emoji: "🧸", tickets: 15, earned: (s) => s.collectibles >= 10 },
  { id: "collector-50", title: "Treasure Keeper", description: "Collect 50 in-game achievements.", emoji: "👑", tickets: 40, earned: (s) => s.collectibles >= 50 },
  { id: "streak-30", title: "Unstoppable", description: "Play 30 days in a row.", emoji: "💎", tickets: 100, earned: (s) => s.bestStreak >= 30 },
  ...CATEGORY_BADGES.map(({ category, emoji }): BadgeDef => ({
    id: `master-${category.toLowerCase()}`,
    title: `${category} Master`,
    description: `Finish ${CATEGORY_MASTERY_GAMES} ${category} games across ${CATEGORY_MASTERY_DISTINCT} different titles.`,
    emoji,
    tickets: 30,
    earned: (s) => {
      const c = s.categories[category];
      return Boolean(c && c.finished >= CATEGORY_MASTERY_GAMES && c.distinct >= CATEGORY_MASTERY_DISTINCT);
    },
  })),
];

// ── Shapes returned by the rewards API ───────────────────────────────────────

export interface RewardLine {
  reason: RewardReason;
  label: string;
  amount: number;
}

export interface BadgeSummary {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tickets: number;
}

/** Result of finishing a game, returned by POST /api/scores. */
export interface GameRewardResult {
  ticketsEarned: number;
  lines: RewardLine[];
  newBadges: BadgeSummary[];
  streak: { current: number; best: number };
  balance: number;
  /** True when today's ticket limit was already reached. */
  dailyLimitReached: boolean;
}

/** Result of POST /api/achievements. */
export interface AchievementSyncResult {
  newAchievements: { id: string; title: string; description: string; emoji: string }[];
  newBadges: BadgeSummary[];
  ticketsEarned: number;
  balance: number;
}

/** Result of GET /api/rewards. */
export interface RewardsOverview {
  balance: number;
  streak: { current: number; best: number; playedToday: boolean };
  rewardedGamesToday: number;
  maxRewardedGamesPerDay: number;
  badges: (BadgeSummary & { earnedAt: string | null })[];
  /** In-game achievements per game, for games that have any. */
  collections: {
    gameId: string;
    items: { id: string; title: string; description: string; emoji: string; earnedAt: string | null }[];
  }[];
  recent: {
    id: string;
    delta: number;
    label: string;
    gameId: string | null;
    createdAt: string;
  }[];
}

export function toBadgeSummary(b: BadgeDef): BadgeSummary {
  return { id: b.id, title: b.title, description: b.description, emoji: b.emoji, tickets: b.tickets };
}
