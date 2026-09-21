import type { SegmentSpec } from '../../../types';
import { pickBossForLevel } from '../../bosses/bossDefs';
import { BOSS_SEGMENT_LENGTH } from '../../../constants/gameConfig';

export function buildBossSegment(startZ: number, levelIndex: number): SegmentSpec {
  const bossDef = pickBossForLevel(levelIndex);
  const z = startZ + BOSS_SEGMENT_LENGTH / 2;
  return {
    kind: 'boss', startZ, length: BOSS_SEGMENT_LENGTH,
    boss: { bossDefId: bossDef.id, addWaveCount: 0, laneX: 0, z },
  };
}
