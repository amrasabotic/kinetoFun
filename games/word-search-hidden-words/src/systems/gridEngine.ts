import type { Vec2 } from '../utils/directions';

/** Maps normalized (0..1) cursor coordinates to grid cell indices, or null if outside the grid. */
export function cursorToCell(
  cursorX: number,
  cursorY: number,
  gridOriginXNorm: number,
  gridOriginYNorm: number,
  gridSizeNorm: number,
  cellCount: number,
): Vec2 | null {
  const localX = cursorX - gridOriginXNorm;
  const localY = cursorY - gridOriginYNorm;
  if (localX < 0 || localY < 0 || localX >= gridSizeNorm || localY >= gridSizeNorm) return null;
  const col = Math.floor((localX / gridSizeNorm) * cellCount);
  const row = Math.floor((localY / gridSizeNorm) * cellCount);
  if (row < 0 || row >= cellCount || col < 0 || col >= cellCount) return null;
  return { row, col };
}

export function cellKey(v: Vec2): string {
  return `${v.row}:${v.col}`;
}

export function cellsEqual(a: Vec2 | null, b: Vec2 | null): boolean {
  if (!a || !b) return a === b;
  return a.row === b.row && a.col === b.col;
}
