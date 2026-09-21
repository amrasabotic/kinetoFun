import type { BossDef, BossRuntimeState, BossAttackPattern, DifficultyTier } from '../../types';
import { BOSS_DPS_PER_UNIT, CHARGE_DPS_MULTIPLIER } from '../../constants/gameConfig';

export function createBossState(bossDef: BossDef, difficulty: DifficultyTier, laneX: number, z: number): BossRuntimeState {
  const maxHp = Math.round(bossDef.baseHp * difficulty.bossHpMultiplier);
  return {
    bossDefId: bossDef.id, hp: maxHp, maxHp, phaseIndex: 0,
    currentAttack: null, attackTimer: 0, telegraphing: false,
    laneX, z, defeated: false, hitFlash: 0,
  };
}

export interface BossUpdateEvents {
  attackResolved: BossAttackPattern | null;
  summonCount: number;
}

/** Generic phase/attack-pattern/telegraph/summon executor — reads purely from BossDef data, no per-boss branching. */
export function updateBoss(state: BossRuntimeState, bossDef: BossDef, dtMs: number): BossUpdateEvents {
  const events: BossUpdateEvents = { attackResolved: null, summonCount: 0 };
  if (state.defeated) return events;

  if (state.hitFlash > 0) state.hitFlash = Math.max(0, state.hitFlash - dtMs);

  const hpPct = state.hp / state.maxHp;
  let phaseIndex = 0;
  for (let i = 0; i < bossDef.phases.length; i++) {
    if (hpPct <= bossDef.phases[i].hpThresholdPct) phaseIndex = i;
  }
  state.phaseIndex = phaseIndex;

  if (!state.currentAttack) {
    const phase = bossDef.phases[state.phaseIndex];
    const attackId = phase.attackIds[Math.floor(Math.random() * phase.attackIds.length)];
    const pattern = bossDef.attackPatterns.find((a) => a.id === attackId) ?? null;
    if (pattern) {
      state.currentAttack = pattern;
      state.attackTimer = 0;
      state.telegraphing = true;
    }
    return events;
  }

  state.attackTimer += dtMs;
  const atk = state.currentAttack;

  if (state.telegraphing) {
    if (state.attackTimer >= atk.telegraphMs) {
      state.telegraphing = false;
      state.attackTimer = 0;
      if (atk.kind === 'summon') {
        events.summonCount = atk.addWaveCount ?? 0;
      } else {
        events.attackResolved = atk;
      }
    }
  } else if (state.attackTimer >= atk.durationMs) {
    state.currentAttack = null;
    state.attackTimer = 0;
  }

  return events;
}

/** Continuous boss damage from the remaining player crowd (bigger crowd = faster kill), returns true on defeat this tick. */
export function applyCrowdDamage(state: BossRuntimeState, crowdCount: number, dtMs: number, chargeActive: boolean): boolean {
  if (state.defeated) return false;
  const dps = BOSS_DPS_PER_UNIT * crowdCount * (chargeActive ? CHARGE_DPS_MULTIPLIER : 1);
  state.hp = Math.max(0, state.hp - dps * (dtMs / 1000));
  state.hitFlash = Math.max(state.hitFlash, 40);
  if (state.hp <= 0) {
    state.defeated = true;
    return true;
  }
  return false;
}
