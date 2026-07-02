import type { UnitPool } from '../entities/UnitPool';
import { COMBAT_TICK_MS, CHARGE_MODE_COMBAT_SPEED_MULTIPLIER } from '../../constants/gameConfig';

export interface CombatTickResult {
  playerKilled: number;
  enemyKilled: number;
  resolved: 'player-empty' | 'enemy-empty' | null;
}

/**
 * 1-for-1 attrition tick between the player crowd and an engaged enemy
 * crowd, run while their world-Z ranges overlap. `accumulator` is an
 * externally-owned mutable box so the caller controls its lifetime
 * (reset when a new enemy crowd engages).
 */
export function tickCombat(
  pool: UnitPool,
  dtMs: number,
  accumulator: { value: number },
  chargeActive: boolean,
): CombatTickResult {
  const tickMs = COMBAT_TICK_MS / (chargeActive ? CHARGE_MODE_COMBAT_SPEED_MULTIPLIER : 1);
  accumulator.value += dtMs;

  let playerKilled = 0;
  let enemyKilled = 0;

  while (accumulator.value >= tickMs) {
    const playerActive = pool.getActive().filter((u) => u.team === 'player');
    if (playerActive.length === 0) { accumulator.value = 0; break; }
    const enemyActive = pool.getActive().filter((u) => u.team === 'enemy');
    if (enemyActive.length === 0) { accumulator.value = 0; break; }

    accumulator.value -= tickMs;
    pool.release(playerActive[playerActive.length - 1]);
    pool.release(enemyActive[enemyActive.length - 1]);
    playerKilled++;
    enemyKilled++;
  }

  const playerCount = pool.countActive('player');
  const enemyCount = pool.countActive('enemy');
  let resolved: CombatTickResult['resolved'] = null;
  if (playerCount === 0) resolved = 'player-empty';
  else if (enemyCount === 0) resolved = 'enemy-empty';

  return { playerKilled, enemyKilled, resolved };
}
