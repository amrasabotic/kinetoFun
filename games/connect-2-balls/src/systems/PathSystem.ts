import { Position, PathSegment, LevelData } from '../data/types';

export function posEquals(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getNeighbors(pos: Position, gridSize: number): Position[] {
  const neighbors: Position[] = [];
  if (pos.row > 0) neighbors.push({ row: pos.row - 1, col: pos.col });
  if (pos.row < gridSize - 1) neighbors.push({ row: pos.row + 1, col: pos.col });
  if (pos.col > 0) neighbors.push({ row: pos.row, col: pos.col - 1 });
  if (pos.col < gridSize - 1) neighbors.push({ row: pos.row, col: pos.col + 1 });
  return neighbors;
}

export function isCellOccupied(pos: Position, paths: PathSegment[], excludePairId?: number): boolean {
  return paths.some(
    (path) =>
      path.pairId !== excludePairId &&
      path.cells.some((cell) => posEquals(cell, pos))
  );
}

export function isCellWall(pos: Position, level: LevelData): boolean {
  return level.walls?.some((w) => posEquals(w, pos)) ?? false;
}

export function isCellBall(pos: Position, level: LevelData, excludePairId?: number): boolean {
  return level.pairs.some(
    (pair, idx) =>
      idx !== excludePairId &&
      (posEquals(pair.positions[0], pos) || posEquals(pair.positions[1], pos))
  );
}

export function canMoveTo(
  from: Position,
  to: Position,
  gridSize: number,
  paths: PathSegment[],
  level: LevelData,
  currentPairId: number
): boolean {
  if (to.row < 0 || to.row >= gridSize || to.col < 0 || to.col >= gridSize) return false;
  if (isCellWall(to, level)) return false;
  if (isCellOccupied(to, paths, currentPairId)) return false;
  if (isCellBall(to, level, currentPairId)) return false;

  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  if (dr + dc !== 1) return false;

  return true;
}

export function findPath(
  from: Position,
  to: Position,
  gridSize: number,
  paths: PathSegment[],
  level: LevelData,
  currentPairId: number
): Position[] | null {
  const queue: Position[][] = [[from]];
  const visited = new Set<string>();
  visited.add(`${from.row},${from.col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const last = current[current.length - 1];

    if (posEquals(last, to)) return current;

    const neighbors = getNeighbors(last, gridSize);
    for (const n of neighbors) {
      const key = `${n.row},${n.col}`;
      if (visited.has(key)) continue;
      if (!posEquals(n, to) && (isCellWall(n, level) || isCellOccupied(n, paths, currentPairId) || isCellBall(n, level, currentPairId))) continue;
      visited.add(key);
      queue.push([...current, n]);
    }
  }
  return null;
}

export function snapToGrid(
  cursorX: number,
  cursorY: number,
  gridOffsetX: number,
  gridOffsetY: number,
  cellSize: number,
  gridSize: number
): Position | null {
  const col = Math.floor((cursorX - gridOffsetX) / cellSize);
  const row = Math.floor((cursorY - gridOffsetY) / cellSize);
  if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
    return { row, col };
  }
  return null;
}

export function isLevelComplete(paths: PathSegment[], level: LevelData): boolean {
  return (
    paths.length === level.pairs.length &&
    paths.every((p) => p.completed)
  );
}
