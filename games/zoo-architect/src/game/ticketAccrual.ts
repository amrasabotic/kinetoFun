/**
 * Passive ticket generation, based on total zoo appeal, accrued over real
 * wall-clock time since the last collection — same persisted-timestamp-vs-
 * Date.now() pattern as farm-builder's crop growth, but uncapped (tickets
 * only go up, there's no [0,1] ceiling to this like a growth fraction).
 */

export const TICKET_RATE_PER_APPEAL_PER_SEC = 0.02;

export function computeAccruedTickets(
  lastCollectedAt: number,
  totalAppealScore: number,
  now: number,
): number {
  const elapsedSec = Math.max(0, (now - lastCollectedAt) / 1000);
  return totalAppealScore * TICKET_RATE_PER_APPEAL_PER_SEC * elapsedSec;
}
