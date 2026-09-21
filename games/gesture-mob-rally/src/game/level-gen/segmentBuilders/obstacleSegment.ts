import type { SegmentSpec, DifficultyTier, ObstaclePlacement } from '../../../types';
import { obstaclePool } from '../../obstacles/obstacleDefs';
import { weightedPick, nextId, randomRange } from '../../../utils/mathUtils';
import { OBSTACLE_SEGMENT_LENGTH, TRACK_HALF_WIDTH } from '../../../constants/gameConfig';

export function buildObstacleSegment(startZ: number, difficulty: DifficultyTier, rand: () => number): SegmentSpec {
  const obstacleCount = Math.max(1, Math.min(3, Math.round(difficulty.obstacleFrequency)));
  const pool = obstaclePool(difficulty.tier);

  const obstacles: ObstaclePlacement[] = [];
  for (let i = 0; i < obstacleCount; i++) {
    const def = weightedPick(pool, rand);
    if (!def) continue;
    const laneX = randomRange(-TRACK_HALF_WIDTH * 0.65, TRACK_HALF_WIDTH * 0.65);
    const z = startZ + ((i + 0.5) / obstacleCount) * OBSTACLE_SEGMENT_LENGTH;
    obstacles.push({
      id: nextId(), obstacleDefId: def.id, laneX, z,
      hit: false, animPhase: rand() * Math.PI * 2, destroyed: false,
    });
  }

  return { kind: 'obstacle', startZ, length: OBSTACLE_SEGMENT_LENGTH, obstacles };
}
