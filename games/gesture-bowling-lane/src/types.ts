export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'timed' | 'zen' | 'daily';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — hand's live position
  cursorY: number;
  isHovering: boolean; // a hand is currently detected
  isOpenPalm: boolean;
  isFist: boolean;
  isTwoHandsRaised: boolean; // restart the game
}

/** The gesture-driven swing state machine — no state may be skipped. */
export type SwingState = 'READY' | 'BACKSWING' | 'FORWARD_SWING' | 'ROLLING' | 'RESOLVED';

export interface SwingSnapshot {
  state: SwingState;
  lanePosition: number; // -1..1, locked in when the backswing starts
  power: number; // 0..1, live during FORWARD_SWING, fixed at release
  curve: number; // -1..1 sideways velocity captured at release, fixed at release
  rollProgress: number; // 0..1 during ROLLING
  ballLateral: number; // live lateral position of the ball while rolling (for rendering)
  outcome: RollOutcome | null;
}

export interface RollOutcome {
  finalLateral: number; // where the ball crossed the pin deck, -1.3..1.3
  isGutter: boolean;
  knockedPinIds: number[]; // pins newly knocked down by this roll
}

export interface DifficultyConfig {
  hitRadiusBase: number; // base pin-knockdown radius at zero power
  hitRadiusPerPower: number; // additional radius per unit of power
  curveSensitivity: number; // how much release-velocity curve bends the ball path
  gutterThreshold: number; // |lateral| beyond this at the deck is a gutter ball
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { hitRadiusBase: 0.5, hitRadiusPerPower: 0.5, curveSensitivity: 0.7, gutterThreshold: 1.3 },
  medium: { hitRadiusBase: 0.38, hitRadiusPerPower: 0.42, curveSensitivity: 1.0, gutterThreshold: 1.15 },
  hard: { hitRadiusBase: 0.3, hitRadiusPerPower: 0.34, curveSensitivity: 1.4, gutterThreshold: 1.0 },
};

/** Standard 10-pin layout: row (0 = head pin, closest to bowler) + lateral offset. */
export interface PinDef {
  id: number; // 1-10, standard pin numbering
  row: number;
  lateral: number;
}

export const PIN_LAYOUT: PinDef[] = [
  { id: 1, row: 0, lateral: 0 },
  { id: 2, row: 1, lateral: -0.5 },
  { id: 3, row: 1, lateral: 0.5 },
  { id: 4, row: 2, lateral: -1 },
  { id: 5, row: 2, lateral: 0 },
  { id: 6, row: 2, lateral: 1 },
  { id: 7, row: 3, lateral: -1.5 },
  { id: 8, row: 3, lateral: -0.5 },
  { id: 9, row: 3, lateral: 0.5 },
  { id: 10, row: 3, lateral: 1.5 },
];
