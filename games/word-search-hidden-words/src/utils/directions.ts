export interface Vec2 {
  row: number;
  col: number;
}

/** All 8 grid directions as (rowDelta, colDelta). */
export const ALL_DIRECTIONS: Vec2[] = [
  { row: 0, col: 1 },   // right
  { row: 0, col: -1 },  // left
  { row: 1, col: 0 },   // down
  { row: -1, col: 0 },  // up
  { row: 1, col: 1 },   // down-right
  { row: -1, col: -1 }, // up-left
  { row: 1, col: -1 },  // down-left
  { row: -1, col: 1 },  // up-right
];

/** Straight (non-diagonal) directions only — used for "easy" difficulty. */
export const STRAIGHT_DIRECTIONS: Vec2[] = [
  { row: 0, col: 1 },
  { row: 0, col: -1 },
  { row: 1, col: 0 },
  { row: -1, col: 0 },
];

export function directionsForDifficulty(allowDiagonal: boolean): Vec2[] {
  return allowDiagonal ? ALL_DIRECTIONS : STRAIGHT_DIRECTIONS;
}

export function addVec(a: Vec2, b: Vec2): Vec2 {
  return { row: a.row + b.row, col: a.col + b.col };
}

export function normalizeDirection(from: Vec2, to: Vec2): Vec2 | null {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  if (dRow === 0 && dCol === 0) return null;
  const rowSign = dRow === 0 ? 0 : dRow > 0 ? 1 : -1;
  const colSign = dCol === 0 ? 0 : dCol > 0 ? 1 : -1;
  // Only accept moves that lie exactly on one of the 8 straight/diagonal rays.
  if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return null;
  return { row: rowSign, col: colSign };
}

export function vecEquals(a: Vec2, b: Vec2): boolean {
  return a.row === b.row && a.col === b.col;
}

export function vecKey(v: Vec2): string {
  return `${v.row},${v.col}`;
}
