// Client-side helper for collecting in-game achievements.

import type { AchievementSyncResult } from "@/lib/rewards/catalog";
import { GAME_ACHIEVEMENTS, readUnlockedAchievements } from "@/lib/rewards/game-achievements";

/**
 * Send the achievements this browser has unlocked for a game, plus any ids the
 * game reported directly. Ids already in `alreadySent` are skipped, and the
 * request is not made when there is nothing new. Never throws.
 */
export async function syncAchievements(
  gameId: string,
  alreadySent: Set<string>,
  extraIds: string[] = [],
): Promise<AchievementSyncResult | null> {
  if (!GAME_ACHIEVEMENTS[gameId]) return null;
  let stored: string[] = [];
  try {
    stored = readUnlockedAchievements(gameId, window.localStorage);
  } catch {
    // Storage can be blocked (private mode, site data disabled).
  }
  const pending = [...new Set([...stored, ...extraIds])].filter((id) => !alreadySent.has(id));
  if (pending.length === 0) return null;

  try {
    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, achievementIds: pending }),
    });
    if (!res.ok) return null;
    pending.forEach((id) => alreadySent.add(id));
    return (await res.json()) as AchievementSyncResult;
  } catch {
    return null;
  }
}
