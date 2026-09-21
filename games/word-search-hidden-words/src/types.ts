import type { Vec2 } from './utils/directions';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'timed' | 'zen' | 'daily';

export interface HandFrame {
  detected: boolean;
  confidence: number;
  cursorX: number; // 0..1 normalized, mirrored for natural control
  cursorY: number; // 0..1 normalized
  isPalmOpen: boolean;
  isFist: boolean;
}

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number;
  cursorY: number;
  isHovering: boolean;
  isOpenPalm: boolean;
  isFist: boolean;
  isPinching: boolean; // thumb+index "pick" — press to select, release to confirm
  isTwoHandsRaised: boolean;
}

export interface PlacedWord {
  word: string;
  start: Vec2;
  direction: Vec2;
  cells: Vec2[];
  found: boolean;
}

export interface GridCell {
  letter: string;
  row: number;
  col: number;
}

/** The gesture-driven selection state machine — no state may be skipped. */
export type SelectionState =
  | 'IDLE'
  | 'HOVERED'
  | 'START_SELECTED'
  | 'TRACING'
  | 'CONFIRMING'
  | 'VALIDATED_SUCCESS'
  | 'VALIDATED_FAIL';

export interface SelectionSnapshot {
  state: SelectionState;
  hoveredCell: Vec2 | null;
  path: Vec2[];
  lockedDirection: Vec2 | null;
}

export interface DifficultyConfig {
  size: number;
  allowDiagonal: boolean;
  allowReverse: boolean;
  wordCount: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { size: 8, allowDiagonal: false, allowReverse: false, wordCount: 6 },
  medium: { size: 10, allowDiagonal: true, allowReverse: true, wordCount: 8 },
  hard: { size: 12, allowDiagonal: true, allowReverse: true, wordCount: 10 },
};
