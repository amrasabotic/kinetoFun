export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = '301' | '501' | 'cricket';
export type PlayerId = 'you' | 'cpu';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — aims the dart
  cursorY: number;
  isHovering: boolean; // a hand is currently detected
  isOpenPalm: boolean; // release the thrown dart
  isFist: boolean; // draw the throw back (hold to charge power)
  isTwoHandsRaised: boolean; // restart the match
}

/** The gesture-driven throw state machine — no state may be skipped. */
export type ThrowState = 'AIMING' | 'DRAWING' | 'IN_FLIGHT' | 'RESOLVED';

export type DartRing =
  | 'double_bull'
  | 'bull'
  | 'triple'
  | 'double'
  | 'single_inner'
  | 'single_outer'
  | 'miss';

export interface DartOutcome {
  sector: number; // 1-20, or 25 for bull, 0 for a clean miss
  ring: DartRing;
  multiplier: number; // 0, 1, 2, or 3
  points: number; // sector * multiplier (50 for double bull, 25 for outer bull)
  x: number; // -1..1 impact position relative to board center
  y: number;
}

export interface ThrowSnapshot {
  state: ThrowState;
  aim: { x: number; y: number }; // normalized reticle position over the board
  power: number; // 0..1 charge built up while drawing
  flightProgress: number; // 0..1 during IN_FLIGHT
  impact: { x: number; y: number } | null;
  outcome: DartOutcome | null;
}

export interface ThrowConfig {
  requiredPower: number; // 0..1 throw strength needed to reach the board cleanly
  jitterBase: number; // baseline scatter radius applied to every throw (hand shake)
  overUnderScale: number; // extra scatter added per unit of over/under-throwing
}

/**
 * The real oche distance never changes in darts — unlike archery's
 * per-difficulty distance/wind, difficulty here only changes the AI
 * opponent's skill (see DIFFICULTY_AI). The player always throws under this
 * one fixed profile.
 */
export const PLAYER_THROW_CONFIG: ThrowConfig = { requiredPower: 0.55, jitterBase: 0.03, overUnderScale: 0.6 };

export interface AiProfile {
  jitter: number; // scatter radius applied to the AI's simulated throw
  thinkMs: number; // delay before the AI's next dart, purely cosmetic pacing
}

export const DIFFICULTY_AI: Record<Difficulty, AiProfile> = {
  easy: { jitter: 0.26, thinkMs: 700 },
  medium: { jitter: 0.14, thinkMs: 550 },
  hard: { jitter: 0.055, thinkMs: 400 },
};
