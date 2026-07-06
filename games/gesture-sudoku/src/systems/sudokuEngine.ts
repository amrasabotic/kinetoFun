import type { CellPos, Grid } from '../types';
import { GRID_SIZE, BOX_SIZE } from '../types';

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValidPlacement(grid: number[][], row: number, col: number, value: number): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      if (grid[boxRow + r][boxCol + c] === value) return false;
    }
  }
  return true;
}

function fillCell(grid: number[][], pos: number, rng: () => number): boolean {
  if (pos === GRID_SIZE * GRID_SIZE) return true;
  const row = Math.floor(pos / GRID_SIZE);
  const col = pos % GRID_SIZE;
  const candidates = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  for (const value of candidates) {
    if (isValidPlacement(grid, row, col, value)) {
      grid[row][col] = value;
      if (fillCell(grid, pos + 1, rng)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

/** Randomized backtracking fill — produces a complete, valid 9x9 Sudoku solution. */
export function generateFullGrid(rng: () => number): number[][] {
  const grid: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  fillCell(grid, 0, rng);
  return grid;
}

/**
 * Removes cells down to `clueCount` remaining, using a shuffled removal
 * order. Clue count alone is the standard difficulty proxy here — this
 * deliberately doesn't run a uniqueness solver (a real one would need
 * constraint propagation or exhaustive search), a simplification chosen for
 * build simplicity, same as this catalog's other "approximate the read,
 * keep the code simple" engine tradeoffs.
 */
export function removeCellsForClues(fullGrid: number[][], clueCount: number, rng: () => number): number[][] {
  const grid = fullGrid.map((row) => [...row]);
  const positions = shuffled(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i),
    rng,
  );
  const removeCount = GRID_SIZE * GRID_SIZE - clueCount;
  for (let i = 0; i < removeCount; i++) {
    const row = Math.floor(positions[i] / GRID_SIZE);
    const col = positions[i] % GRID_SIZE;
    grid[row][col] = 0;
  }
  return grid;
}

export interface GeneratedPuzzle {
  grid: Grid;
  solution: number[][];
}

export function generatePuzzle(clueCount: number, rng: () => number): GeneratedPuzzle {
  const solution = generateFullGrid(rng);
  const withClues = removeCellsForClues(solution, clueCount, rng);
  const grid = withClues.map((row) => row.map((v) => ({ value: v === 0 ? null : v, isClue: v !== 0 })));
  return { grid, solution };
}

/** Every cell position that currently conflicts with another same-valued cell in its row, column, or box. */
export function findConflicts(grid: Grid): Set<string> {
  const conflicts = new Set<string>();

  const markDuplicates = (cells: CellPos[]) => {
    const byValue = new Map<number, CellPos[]>();
    for (const pos of cells) {
      const value = grid[pos.row][pos.col].value;
      if (value === null) continue;
      const list = byValue.get(value) ?? [];
      list.push(pos);
      byValue.set(value, list);
    }
    for (const list of byValue.values()) {
      if (list.length > 1) {
        for (const pos of list) conflicts.add(`${pos.row},${pos.col}`);
      }
    }
  };

  for (let row = 0; row < GRID_SIZE; row++) {
    markDuplicates(Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col })));
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    markDuplicates(Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col })));
  }
  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += BOX_SIZE) {
      const cells: CellPos[] = [];
      for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
          cells.push({ row: boxRow + r, col: boxCol + c });
        }
      }
      markDuplicates(cells);
    }
  }

  return conflicts;
}

export function isSolved(grid: Grid): boolean {
  const allFilled = grid.every((row) => row.every((cell) => cell.value !== null));
  return allFilled && findConflicts(grid).size === 0;
}
