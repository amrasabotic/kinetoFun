import type { SegmentSpec, DifficultyTier } from '../../../types';
import { CASTLE_SEGMENT_LENGTH } from '../../../constants/gameConfig';

export function buildCastleSegment(startZ: number, difficulty: DifficultyTier): SegmentSpec {
  const hp = Math.round(180 * difficulty.bossHpMultiplier);
  const z = startZ + CASTLE_SEGMENT_LENGTH / 2;
  return { kind: 'castle', startZ, length: CASTLE_SEGMENT_LENGTH, castle: { hp, z } };
}
