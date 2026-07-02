import type { SegmentSpec, DifficultyTier, GatePlacement } from '../../../types';
import { gatePool } from '../../gates/gateDefs';
import { weightedPick, laneSlots } from '../../../utils/mathUtils';
import { GATE_SEGMENT_LENGTH, TRACK_HALF_WIDTH } from '../../../constants/gameConfig';

export function buildGateSegment(startZ: number, difficulty: DifficultyTier, rand: () => number): SegmentSpec {
  const count = 2 + Math.floor(rand() * 2); // 2-3 gates
  const pool = gatePool(difficulty.gateComplexityMax);
  const lanes = laneSlots(count, TRACK_HALF_WIDTH);
  const z = startZ + GATE_SEGMENT_LENGTH / 2;

  const gates: GatePlacement[] = lanes.map((laneX) => {
    const def = weightedPick(pool, rand);
    return { laneX, gateDefId: def?.id ?? 'add5', z, resolved: false };
  });

  return { kind: 'gate', startZ, length: GATE_SEGMENT_LENGTH, gates };
}
