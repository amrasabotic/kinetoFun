export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'timed' | 'zen' | 'daily';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — aims the bow
  cursorY: number;
  isHovering: boolean; // a hand is currently detected
  isOpenPalm: boolean; // release the drawn arrow
  isFist: boolean; // draw the bowstring (hold to charge power)
  isTwoHandsRaised: boolean; // restart the round
}

/** The gesture-driven shot state machine — no state may be skipped. */
export type ShotState =
  | 'AIMING'
  | 'DRAWING'
  | 'IN_FLIGHT'
  | 'RESOLVED';

export interface ShotSnapshot {
  state: ShotState;
  aim: { x: number; y: number }; // normalized reticle position over the target plane
  power: number; // 0..1 charge built up while drawing
  flightProgress: number; // 0..1 during IN_FLIGHT
  impact: { x: number; y: number } | null;
  result: ShotResult | null;
}

export type ShotResult = 'bullseye' | 'inner' | 'mid' | 'outer' | 'short' | 'miss';

export interface RoundConfig {
  distance: number; // arbitrary units, higher = farther target, more required power + wind effect
  targetRadius: number; // normalized radius of the outermost ring on screen
  windStrength: number; // 0..1, lateral drift scale
  arrowCount: number;
  timeLimitSeconds: number | null;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, RoundConfig> = {
  easy: { distance: 20, targetRadius: 0.22, windStrength: 0, arrowCount: 8, timeLimitSeconds: null },
  medium: { distance: 35, targetRadius: 0.16, windStrength: 0.35, arrowCount: 8, timeLimitSeconds: null },
  hard: { distance: 50, targetRadius: 0.11, windStrength: 0.65, arrowCount: 8, timeLimitSeconds: null },
};

export const SCORE_RINGS: { result: ShotResult; radiusFraction: number; points: number }[] = [
  { result: 'bullseye', radiusFraction: 0.16, points: 10 },
  { result: 'inner', radiusFraction: 0.4, points: 8 },
  { result: 'mid', radiusFraction: 0.65, points: 5 },
  { result: 'outer', radiusFraction: 1.0, points: 2 },
];
