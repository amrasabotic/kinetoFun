import type { SegmentSpec, DifficultyTier, EnemyArchetype } from '../../../types';
import { nextId } from '../../../utils/mathUtils';
import { ENEMY_SEGMENT_LENGTH } from '../../../constants/gameConfig';

const ARCHETYPES: EnemyArchetype[] = ['basic', 'shielded', 'fast'];

export function buildEnemyCrowdSegment(startZ: number, difficulty: DifficultyTier, rand: () => number): SegmentSpec {
  const baseCount = 8 + difficulty.tier * 5;
  const count = Math.max(4, Math.round(baseCount * difficulty.enemySizeMultiplier));
  const archetype = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)];
  const z = startZ + ENEMY_SEGMENT_LENGTH / 2;

  return {
    kind: 'enemyCrowd', startZ, length: ENEMY_SEGMENT_LENGTH,
    enemyCrowd: { id: nextId(), count, archetype, z, laneX: 0, resolved: false },
  };
}
