export type Direction = [number, number]; // [dRow, dCol]

export const DIRECTIONS: Direction[] = [
  [0, 1],   // →
  [0, -1],  // ←
  [1, 0],   // ↓
  [-1, 0],  // ↑
  [1, 1],   // ↘
  [-1, -1], // ↖
  [1, -1],  // ↙
  [-1, 1],  // ↗
];

export interface Placement {
  word: string;
  row: number;
  col: number;
  dir: Direction;
}

export interface Puzzle {
  grid: string[][];
  size: number;
  placements: Placement[];
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tryPlace(grid: string[][], word: string, size: number): Placement | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const dir = rand(DIRECTIONS);
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    const endRow = row + dir[0] * (word.length - 1);
    const endCol = col + dir[1] * (word.length - 1);
    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const r = row + dir[0] * i;
      const c = col + dir[1] * i;
      const existing = grid[r][c];
      if (existing && existing !== word[i]) { ok = false; break; }
    }
    if (!ok) continue;

    for (let i = 0; i < word.length; i++) {
      const r = row + dir[0] * i;
      const c = col + dir[1] * i;
      grid[r][c] = word[i];
    }
    return { word, row, col, dir };
  }
  return null;
}

export function generatePuzzle(size: number, words: string[]): Puzzle {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Try several times to fit all words.
  for (let outer = 0; outer < 10; outer++) {
    const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
    const placements: Placement[] = [];
    let allPlaced = true;
    const sorted = [...words].sort((a, b) => b.length - a.length);
    for (const w of sorted) {
      const p = tryPlace(grid, w.toUpperCase(), size);
      if (!p) { allPlaced = false; break; }
      placements.push(p);
    }
    if (!allPlaced) continue;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * 26)];
      }
    }
    return { grid, size, placements };
  }
  throw new Error("Could not generate puzzle");
}

/** Get cells along the line from (r1,c1) to (r2,c2) if it forms a valid line (horizontal, vertical, diagonal). */
export function lineCells(r1: number, c1: number, r2: number, c2: number): { row: number; col: number }[] | null {
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr === 0 && dc === 0) return [{ row: r1, col: c1 }];
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  const valid = dr === 0 || dc === 0 || adr === adc;
  if (!valid) return null;
  const steps = Math.max(adr, adc);
  const sr = dr === 0 ? 0 : dr / steps;
  const sc = dc === 0 ? 0 : dc / steps;
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({ row: r1 + sr * i, col: c1 + sc * i });
  }
  return cells;
}
