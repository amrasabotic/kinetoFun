import type { BossDef } from '../../types';

/**
 * Pure data — BossSystem reads phases/attackPatterns generically, so adding a
 * new boss later is a new entry here, not new engine code.
 */
export const BOSS_DEFS: Record<string, BossDef> = {
  warlord: {
    id: 'warlord', name: 'The Warlord', baseHp: 260,
    color: '#B45309', accentColor: '#FCD34D',
    minLevelIndex: 0,
    phases: [
      { hpThresholdPct: 1.0, attackIds: ['melee', 'chargeAttack'] },
      { hpThresholdPct: 0.5, attackIds: ['melee', 'chargeAttack', 'summonAdds'] },
    ],
    attackPatterns: [
      { id: 'melee', kind: 'melee', telegraphMs: 700, durationMs: 400, damage: 6 },
      { id: 'chargeAttack', kind: 'charge', telegraphMs: 1000, durationMs: 600, damage: 14 },
      { id: 'summonAdds', kind: 'summon', telegraphMs: 500, durationMs: 200, damage: 0, addWaveCount: 20 },
    ],
  },
  siegeTitan: {
    id: 'siegeTitan', name: 'Siege Titan', baseHp: 340,
    color: '#475569', accentColor: '#38BDF8',
    minLevelIndex: 5,
    phases: [
      { hpThresholdPct: 1.0, attackIds: ['rockThrow', 'stomp'] },
      { hpThresholdPct: 0.5, attackIds: ['rockThrow', 'stomp', 'summonAdds'] },
    ],
    attackPatterns: [
      { id: 'rockThrow', kind: 'aoe', telegraphMs: 900, durationMs: 500, damage: 10 },
      { id: 'stomp', kind: 'aoe', telegraphMs: 800, durationMs: 450, damage: 12 },
      { id: 'summonAdds', kind: 'summon', telegraphMs: 500, durationMs: 200, damage: 0, addWaveCount: 10 },
    ],
  },
};

export function pickBossForLevel(levelIndex: number): BossDef {
  const eligible = Object.values(BOSS_DEFS).filter((b) => b.minLevelIndex <= levelIndex);
  const pool = eligible.length > 0 ? eligible : Object.values(BOSS_DEFS);
  return pool[Math.floor(Math.random() * pool.length)];
}
