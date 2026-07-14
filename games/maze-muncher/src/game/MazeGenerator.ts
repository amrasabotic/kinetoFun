import type { CellWalls, Collectible, GridPos, Maze, MazeTheme } from '../types/GameTypes';
import { ALL_DIRS, OPPOSITE, isOpen, stepCell } from '../utils/grid';

// ── Seeded PRNG (mulberry32) — deterministic per level so a maze looks the
// same every time it's revisited, without shipping 10 hand-authored grids. ──
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface MazeSeedConfig {
  id: string;
  label: string;
  cols: number;
  rows: number;
  seed: number;
  /** Fraction of interior walls additionally knocked down to create loops/shortcuts. */
  loopFactor: number;
  theme: MazeTheme;
}

export const MAZE_THEMES: MazeTheme[] = [
  { name: 'Cyber Cyan', pathColor: '#0af0ff', glowColor: '#0af0ff', bgTop: '#020617', bgBottom: '#041322', accent: '#ff2ecb' },
  { name: 'Violet Grid', pathColor: '#b26bff', glowColor: '#b26bff', bgTop: '#0a0414', bgBottom: '#160a2b', accent: '#38f2c0' },
  { name: 'Toxic Green', pathColor: '#39ff88', glowColor: '#39ff88', bgTop: '#020e08', bgBottom: '#03170e', accent: '#ffd23f' },
  { name: 'Solar Flare', pathColor: '#ff9a3c', glowColor: '#ff9a3c', bgTop: '#150701', bgBottom: '#230c02', accent: '#00e5ff' },
  { name: 'Plasma Pink', pathColor: '#ff4fd8', glowColor: '#ff4fd8', bgTop: '#12021a', bgBottom: '#1e0630', accent: '#4dffea' },
  { name: 'Ice Field', pathColor: '#66d9ff', glowColor: '#66d9ff', bgTop: '#020a14', bgBottom: '#031524', accent: '#ffe066' },
  { name: 'Molten Core', pathColor: '#ff5252', glowColor: '#ff5252', bgTop: '#140202', bgBottom: '#230404', accent: '#7cffcb' },
  { name: 'Gold Rush', pathColor: '#ffd23f', glowColor: '#ffd23f', bgTop: '#120e02', bgBottom: '#1e1704', accent: '#8a5cff' },
  { name: 'Deep Ocean', pathColor: '#2ee6d6', glowColor: '#2ee6d6', bgTop: '#010a12', bgBottom: '#021a26', accent: '#ff6b9d' },
  { name: 'Nebula Rose', pathColor: '#ff6ec7', glowColor: '#ff6ec7', bgTop: '#0c0212', bgBottom: '#190524', accent: '#7bf1a8' },
];

export const MAZE_SEEDS: MazeSeedConfig[] = MAZE_THEMES.map((theme, i) => ({
  id: `sector-${i + 1}`,
  label: `Sector ${i + 1} — ${theme.name}`,
  cols: 15 + ((i % 3) * 2), // 15, 17, 19 cycling
  rows: 15 + (((i + 1) % 3) * 2),
  seed: 90001 + i * 7919,
  loopFactor: 0.14 + i * 0.015,
  theme,
}));

function emptyCell(): CellWalls {
  return { up: true, down: true, left: true, right: true };
}

function removeWall(cells: CellWalls[][], a: GridPos, dir: 'up' | 'down' | 'left' | 'right', b: GridPos) {
  cells[a.row][a.col][dir] = false;
  cells[b.row][b.col][OPPOSITE[dir]] = false;
}

/** Randomized recursive backtracker — builds a perfect (fully-connected, loop-free) maze. */
function carvePerfectMaze(cols: number, rows: number, rand: () => number): CellWalls[][] {
  const cells: CellWalls[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => emptyCell()),
  );
  const visited: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const stack: GridPos[] = [{ col: 0, row: 0 }];
  visited[0][0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = shuffle(ALL_DIRS, rand)
      .map((dir) => {
        const v = dir === 'up' ? { col: 0, row: -1 } : dir === 'down' ? { col: 0, row: 1 } : dir === 'left' ? { col: -1, row: 0 } : { col: 1, row: 0 };
        return { dir, pos: { col: current.col + v.col, row: current.row + v.row } };
      })
      .filter(({ pos }) => pos.col >= 0 && pos.col < cols && pos.row >= 0 && pos.row < rows && !visited[pos.row][pos.col]);

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const { dir, pos } = candidates[0];
    removeWall(cells, current, dir, pos);
    visited[pos.row][pos.col] = true;
    stack.push(pos);
  }
  return cells;
}

/** Knocks down a fraction of remaining interior walls to create loops/shortcuts (Pac-Man-style, not a "perfect" maze). */
function carveLoops(cells: CellWalls[][], cols: number, rows: number, loopFactor: number, rand: () => number): void {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (col < cols - 1 && cells[row][col].right && rand() < loopFactor) {
        removeWall(cells, { col, row }, 'right', { col: col + 1, row });
      }
      if (row < rows - 1 && cells[row][col].down && rand() < loopFactor) {
        removeWall(cells, { col, row }, 'down', { col, row: row + 1 });
      }
    }
  }
}

function bfsDistances(maze: Maze, from: GridPos): Map<string, number> {
  const dist = new Map<string, number>();
  const startKey = `${from.col},${from.row}`;
  dist.set(startKey, 0);
  const queue: GridPos[] = [from];
  let head = 0;
  while (head < queue.length) {
    const pos = queue[head++];
    const d = dist.get(`${pos.col},${pos.row}`)!;
    for (const dir of ALL_DIRS) {
      if (!isOpen(maze, pos.col, pos.row, dir)) continue;
      const next = stepCell(maze, pos.col, pos.row, dir);
      const key = `${next.col},${next.row}`;
      if (dist.has(key)) continue;
      dist.set(key, d + 1);
      queue.push(next);
    }
  }
  return dist;
}

export function generateMaze(config: MazeSeedConfig): Maze {
  const rand = mulberry32(config.seed);
  const { cols, rows } = config;
  const cells = carvePerfectMaze(cols, rows, rand);
  carveLoops(cells, cols, rows, config.loopFactor, rand);

  const warpRow = Math.floor(rows / 2);
  cells[warpRow][0].left = false;
  cells[warpRow][cols - 1].right = false;

  const playerSpawn: GridPos = { col: Math.floor(cols / 2), row: rows - 2 };
  const enemyHome: GridPos = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) - 1 >= 0 ? Math.floor(rows / 2) - 1 : 0 };

  const maze: Maze = {
    cols,
    rows,
    cells,
    intersections: [],
    playerSpawn,
    enemyHome,
    warpRow,
    collectibles: [],
    theme: config.theme,
    seedLabel: config.label,
  };

  const intersections: GridPos[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const openCount = ALL_DIRS.filter((d) => isOpen(maze, col, row, d)).length;
      if (openCount >= 3) intersections.push({ col, row });
    }
  }
  maze.intersections = intersections;

  const distFromHome = bfsDistances(maze, enemyHome);
  const clearRadius = new Set<string>();
  for (const [key, d] of distFromHome) if (d <= 1) clearRadius.add(key);
  clearRadius.add(`${playerSpawn.col},${playerSpawn.row}`);

  // Dead ends (single open direction) farthest from the enemy base become power orbs —
  // a "run to the corner, bait a chase" risk/reward classic.
  const deadEnds: { pos: GridPos; dist: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = `${col},${row}`;
      if (clearRadius.has(key)) continue;
      const openCount = ALL_DIRS.filter((d) => isOpen(maze, col, row, d)).length;
      if (openCount === 1) deadEnds.push({ pos: { col, row }, dist: distFromHome.get(key) ?? 0 });
    }
  }
  deadEnds.sort((a, b) => b.dist - a.dist);

  const powerCells: GridPos[] = [];
  const minSep = Math.floor((cols + rows) / 8);
  for (const candidate of deadEnds) {
    if (powerCells.length >= 4) break;
    const farEnough = powerCells.every((p) => Math.abs(p.col - candidate.pos.col) + Math.abs(p.row - candidate.pos.row) >= minSep);
    if (farEnough) powerCells.push(candidate.pos);
  }
  // Fallback: not enough well-separated dead ends — just take the farthest cells overall.
  if (powerCells.length < 4) {
    const allSorted = [...distFromHome.entries()]
      .filter(([key]) => !clearRadius.has(key))
      .sort((a, b) => b[1] - a[1]);
    for (const [key] of allSorted) {
      if (powerCells.length >= 4) break;
      const [col, row] = key.split(',').map(Number);
      if (powerCells.some((p) => p.col === col && p.row === row)) continue;
      powerCells.push({ col, row });
    }
  }

  const powerKeys = new Set(powerCells.map((p) => `${p.col},${p.row}`));
  const collectibles: Collectible[] = [];
  let id = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = `${col},${row}`;
      if (clearRadius.has(key)) continue;
      if (powerKeys.has(key)) {
        collectibles.push({ id: id++, kind: 'power', col, row, collected: false });
      } else {
        collectibles.push({ id: id++, kind: 'orb', col, row, collected: false });
      }
    }
  }
  maze.collectibles = collectibles;

  return maze;
}
