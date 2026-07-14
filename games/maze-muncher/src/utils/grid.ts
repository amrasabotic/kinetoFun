import type { Direction, GridPos, Maze } from '../types/GameTypes';

export const DIR_VECTOR: Record<Direction, GridPos> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const ALL_DIRS: Direction[] = ['up', 'down', 'left', 'right'];

/** Clockwise turn from a heading — used by the Patroller's wall-follower gait. */
export const TURN_RIGHT: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

export const TURN_LEFT: Record<Direction, Direction> = {
  up: 'left',
  left: 'down',
  down: 'right',
  right: 'up',
};

/** Whether `dir` is open (no wall) from cell (col,row), respecting the warp row. */
export function isOpen(maze: Maze, col: number, row: number, dir: Direction): boolean {
  const cell = maze.cells[row]?.[col];
  if (!cell) return false;
  if (dir === 'left' && col === 0 && row === maze.warpRow) return true;
  if (dir === 'right' && col === maze.cols - 1 && row === maze.warpRow) return true;
  return !cell[dir];
}

/** Neighbor cell in `dir`, wrapping through the warp row if applicable. */
export function stepCell(maze: Maze, col: number, row: number, dir: Direction): GridPos {
  const v = DIR_VECTOR[dir];
  let nc = col + v.col;
  const nr = row + v.row;
  if (row === maze.warpRow) {
    if (nc < 0) nc = maze.cols - 1;
    else if (nc >= maze.cols) nc = 0;
  }
  return { col: nc, row: nr };
}

export function openDirs(maze: Maze, col: number, row: number): Direction[] {
  return ALL_DIRS.filter((d) => isOpen(maze, col, row, d));
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Breadth-first shortest path over the maze grid (unweighted, so BFS ==
 * optimal — no need for full A*). Returns the first step direction to take
 * from `from`, or null if already at target / unreachable.
 */
export function bfsFirstStep(maze: Maze, from: GridPos, to: GridPos): Direction | null {
  if (from.col === to.col && from.row === to.row) return null;
  const startKey = cellKey(from.col, from.row);
  const targetKey = cellKey(to.col, to.row);
  const visited = new Set<string>([startKey]);
  const queue: { pos: GridPos; first: Direction }[] = [];

  for (const dir of ALL_DIRS) {
    if (!isOpen(maze, from.col, from.row, dir)) continue;
    const next = stepCell(maze, from.col, from.row, dir);
    const key = cellKey(next.col, next.row);
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push({ pos: next, first: dir });
  }

  let head = 0;
  while (head < queue.length) {
    const { pos, first } = queue[head++];
    if (cellKey(pos.col, pos.row) === targetKey) return first;
    for (const dir of ALL_DIRS) {
      if (!isOpen(maze, pos.col, pos.row, dir)) continue;
      const next = stepCell(maze, pos.col, pos.row, dir);
      const key = cellKey(next.col, next.row);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: next, first });
    }
  }
  return null;
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function isAtCellCenter(pos: number, epsilon = 0.06): boolean {
  return Math.abs(pos - Math.round(pos)) < epsilon;
}
