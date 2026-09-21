import type { CastleRuntimeState } from '../../types';
import { CASTLE_DPS_PER_UNIT, CHARGE_DPS_MULTIPLIER } from '../../constants/gameConfig';

export function createCastleState(hp: number, z: number): CastleRuntimeState {
  return { hp, maxHp: hp, z, collapsed: false, collapseTimer: 0 };
}

/** Returns true the frame the castle collapses. */
export function applyCastleDamage(state: CastleRuntimeState, crowdCount: number, dtMs: number, chargeActive: boolean): boolean {
  if (state.collapsed) return false;
  const dps = CASTLE_DPS_PER_UNIT * crowdCount * (chargeActive ? CHARGE_DPS_MULTIPLIER : 1);
  state.hp = Math.max(0, state.hp - dps * (dtMs / 1000));
  if (state.hp <= 0) {
    state.collapsed = true;
    state.collapseTimer = 0;
    return true;
  }
  return false;
}

export function updateCastleCollapseAnim(state: CastleRuntimeState, dtMs: number): void {
  if (state.collapsed) state.collapseTimer += dtMs;
}
