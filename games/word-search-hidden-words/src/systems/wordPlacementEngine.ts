import type { PlacedWord } from '../types';
import type { Vec2 } from '../utils/directions';
import { directionsForDifficulty, addVec } from '../utils/directions';
import { randomLetter, shuffle } from '../utils/helpers';

export interface PlacementOptions {
  size: number;
  words: string[];
  allowDiagonal: boolean;
  allowReverse: boolean;
  rng: () => number;
}

export interface PlacementResult {
  grid: string[][];
  placedWords: PlacedWord[];
}

function inBounds(size: number, v: Vec2): boolean {
  return v.row >= 0 && v.row < size && v.col >= 0 && v.col < size;
}

function cellsFor(start: Vec2, dir: Vec2, length: number): Vec2[] {
  const cells: Vec2[] = [];
  let cur = start;
  for (let i = 0; i < length; i++) {
    cells.push(cur);
    cur = addVec(cur, dir);
  }
  return cells;
}

function canPlace(grid: (string | null)[][], cells: Vec2[], word: string): boolean {
  for (let i = 0; i < cells.length; i++) {
    const { row, col } = cells[i];
    const existing = grid[row][col];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

/**
 * Deterministic word-search generator: places words first (retrying random
 * start+direction combos), then fills empty cells with random letters.
 * `rng` is injectable so Daily Puzzle mode can reproduce the same grid all day.
 */
export function generatePuzzle(opts: PlacementOptions): PlacementResult {
  const { size, allowDiagonal, allowReverse, rng } = opts;
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const directions = directionsForDifficulty(allowDiagonal);
  const placedWords: PlacedWord[] = [];

  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  for (const rawWord of opts.words) {
    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (!word || word.length > size) continue;

    const candidates = allowReverse ? [word, [...word].reverse().join('')] : [word];
    let placed = false;

    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const candidate = pickRandom(candidates);
      const dir = pickRandom(directions);
      const start: Vec2 = { row: Math.floor(rng() * size), col: Math.floor(rng() * size) };
      const cells = cellsFor(start, dir, candidate.length);
      if (!cells.every((c) => inBounds(size, c))) continue;
      if (!canPlace(grid, cells, candidate)) continue;

      cells.forEach((c, i) => {
        grid[c.row][c.col] = candidate[i];
      });
      placedWords.push({ word, start, direction: dir, cells, found: false });
      placed = true;
    }
  }

  const filled: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? randomLetter()),
  );

  return { grid: filled, placedWords };
}

export function shuffleWordList(words: string[], rng: () => number): string[] {
  // shuffle() uses Math.random internally; reimplement with the injected rng
  // so daily puzzles stay deterministic.
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export { shuffle };
