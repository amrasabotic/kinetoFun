import { Position, PathSegment, LevelData } from '../data/types';
import { findPath } from './PathSystem';

export function getHint(
  level: LevelData,
  completedPaths: PathSegment[]
): { pairId: number; nextCell: Position } | null {
  const completedPairIds = new Set(completedPaths.map((p) => p.pairId));

  for (let i = 0; i < level.pairs.length; i++) {
    if (completedPairIds.has(i)) continue;

    const pair = level.pairs[i];
    const path = findPath(
      pair.positions[0],
      pair.positions[1],
      level.gridSize,
      completedPaths,
      level,
      i
    );

    if (path && path.length > 1) {
      return { pairId: i, nextCell: path[1] };
    }
  }
  return null;
}

export function getHintPath(
  level: LevelData,
  completedPaths: PathSegment[],
  pairId: number
): Position[] | null {
  const pair = level.pairs[pairId];
  if (!pair) return null;

  return findPath(
    pair.positions[0],
    pair.positions[1],
    level.gridSize,
    completedPaths,
    level,
    pairId
  );
}
