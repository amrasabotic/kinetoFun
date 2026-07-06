export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'timed' | 'zen' | 'daily';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — where the hand is pointing (the putt aim target)
  cursorY: number;
  isHovering: boolean;
  isOpenPalm: boolean;
  isFist: boolean;
  isTwoHandsRaised: boolean; // restart the round
}

/** The gesture-driven swing state machine — no state may be skipped. */
export type SwingState = 'READY' | 'CHARGING' | 'ROLLING' | 'RESOLVED';

export type StrokeOutcomeKind = 'holed' | 'water' | 'rest';

export interface StrokeOutcome {
  kind: StrokeOutcomeKind;
  restPosition: { x: number; y: number }; // where the ball ends up for the next stroke (or the drop point after water)
}

export interface SwingSnapshot {
  state: SwingState;
  aimTarget: { x: number; y: number }; // live during READY, locked at the start of BACKSWING
  power: number; // 0..1, live during FORWARD_SWING, fixed at release
  ballPosition: { x: number; y: number }; // live ball position while ROLLING (and at rest otherwise)
  outcome: StrokeOutcome | null;
}

export type ObstacleKind = 'wall' | 'sand' | 'water' | 'slope';

export interface Obstacle {
  kind: ObstacleKind;
  x: number; // 0..1, top-left
  y: number;
  w: number;
  h: number;
  dx?: number; // slope direction (unit-ish vector), only used when kind === 'slope'
  dy?: number;
}

export interface HoleDef {
  id: number;
  par: number;
  tee: { x: number; y: number };
  cup: { x: number; y: number };
  cupRadius: number;
  obstacles: Obstacle[];
}

export interface DifficultyConfig {
  holeCount: number; // how many holes from COURSE are played, in order
  cupRadiusMultiplier: number; // >1 = more forgiving
  maxPuttSpeedMultiplier: number; // >1 = easier to reach far holes without maxing out power
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { holeCount: 4, cupRadiusMultiplier: 1.6, maxPuttSpeedMultiplier: 1.15 },
  medium: { holeCount: 6, cupRadiusMultiplier: 1.0, maxPuttSpeedMultiplier: 1.0 },
  hard: { holeCount: 6, cupRadiusMultiplier: 0.7, maxPuttSpeedMultiplier: 0.9 },
};
