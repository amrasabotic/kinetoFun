import type { Level, SegmentSpec, SegmentKind } from '../../types';
import { computeDifficulty } from '../../constants/difficultyConfig';
import { pickEnvironmentForLevel } from '../environments/environmentDefs';
import { createSeededRandom } from '../../utils/mathUtils';
import { PLAYER_FRONT_OFFSET, LEVELS_PER_BOSS } from '../../constants/gameConfig';
import { buildGateSegment } from './segmentBuilders/gateSegment';
import { buildObstacleSegment } from './segmentBuilders/obstacleSegment';
import { buildEnemyCrowdSegment } from './segmentBuilders/enemyCrowdSegment';
import { buildBossSegment } from './segmentBuilders/bossSegment';
import { buildCastleSegment } from './segmentBuilders/castleSegment';

const BASE_PATTERN: SegmentKind[] = ['gate', 'obstacle', 'gate', 'enemyCrowd', 'obstacle', 'gate'];
const SEGMENT_GAP = 4;

/**
 * Builds a full Level (ordered SegmentSpec[]) from a level index. Difficulty
 * is a pure formula (see difficultyConfig.ts), so this needs zero new data
 * as levelIndex grows — infinite levels "for free". A boss segment is
 * inserted every LEVELS_PER_BOSS levels; a castle segment always closes
 * the level.
 */
export function generateLevel(levelIndex: number, zOffset: number = 0, seed: number = Date.now()): Level {
  const rand = createSeededRandom(seed + levelIndex * 1013904223);
  const difficulty = computeDifficulty(levelIndex);
  const worldId = pickEnvironmentForLevel(levelIndex).id;

  const segments: SegmentSpec[] = [];
  let z = zOffset + PLAYER_FRONT_OFFSET + 8;

  const segmentCount = 3 + Math.floor(rand() * 3); // 3-5 pre-boss/castle segments
  const patternLength = Math.max(2, Math.round(BASE_PATTERN.length * Math.min(1, difficulty.obstacleFrequency / 2)));

  for (let i = 0; i < segmentCount; i++) {
    const kind = BASE_PATTERN[i % patternLength] ?? BASE_PATTERN[i % BASE_PATTERN.length];
    let seg: SegmentSpec;
    switch (kind) {
      case 'obstacle':
        seg = buildObstacleSegment(z, difficulty, rand);
        break;
      case 'enemyCrowd':
        seg = buildEnemyCrowdSegment(z, difficulty, rand);
        break;
      case 'gate':
      default:
        seg = buildGateSegment(z, difficulty, rand);
        break;
    }
    segments.push(seg);
    z += seg.length + SEGMENT_GAP;
  }

  if (levelIndex > 0 && levelIndex % LEVELS_PER_BOSS === 0) {
    const bossSeg = buildBossSegment(z, levelIndex);
    segments.push(bossSeg);
    z += bossSeg.length + SEGMENT_GAP;
  }

  const castleSeg = buildCastleSegment(z, difficulty);
  segments.push(castleSeg);
  z += castleSeg.length;

  return { index: levelIndex, worldId, seed, segments, difficulty, totalLength: z };
}
