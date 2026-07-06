export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'timed' | 'zen' | 'daily';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored
  cursorY: number;
  isHovering: boolean;
  isOpenPalm: boolean;
  isFist: boolean;
  isPinching: boolean; // thumb+index "pick" — pinch down over a cell to select it
  isTwoHandsRaised: boolean; // restart the puzzle
}

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;

export interface CellState {
  value: number | null;
  isClue: boolean;
}

export type Grid = CellState[][]; // Grid[row][col]

export interface DifficultyConfig {
  clueCount: number; // how many of the 81 cells start pre-filled
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { clueCount: 40 },
  medium: { clueCount: 32 },
  hard: { clueCount: 26 },
};

export interface CellPos {
  row: number;
  col: number;
}
