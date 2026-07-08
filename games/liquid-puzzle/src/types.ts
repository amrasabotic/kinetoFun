/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — moves the cursor
  cursorY: number;
  isHovering: boolean; // a hand is currently detected
  isPinching: boolean; // pinch over a tube to grab it, drag over another (still pinching) to pour into it
  isPalmOpen: boolean; // held for PAUSE_HOLD_MS anywhere opens the pause menu
  isThumbsUp: boolean; // edge-triggered — undo the last move
  isVictorySign: boolean; // edge-triggered — show a hint
}

export const TUBE_CAPACITY = 4;

/** A tube's liquid stack — index 0 is the bottom unit, the last entry is the top (pourable) unit. */
export interface Tube {
  colors: number[]; // ColorId indices into COLOR_PALETTE (see utils/colors.ts)
}

export type Board = Tube[];

export interface Move {
  from: number;
  to: number;
}

export type GameMode = 'levels' | 'endless' | 'daily';

export interface LevelConfig {
  level: number;
  colorCount: number;
  tubeCount: number; // total tubes, including empty ones
  emptyTubes: number;
}

export interface PuzzleState {
  board: Board;
  colorCount: number;
  moveHistory: Move[];
  hintsUsed: number;
  undosUsed: number;
  startedAt: number; // performance.now() timestamp
}

export type AnimationQuality = 'low' | 'high';

export interface Settings {
  gestureSensitivity: number; // 0..1, widens the pinch trigger distance (see mediaPipe/handTrackingCore.ts)
  cursorSpeed: number; // 0..1, scales CursorSmoother's responsiveness
  animationQuality: AnimationQuality;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  colorblindMode: boolean; // overlays a symbol per color in addition to hue
  leftHandedMode: boolean; // mirrors the HUD layout only — gesture detection itself is hand-agnostic
}

export const DEFAULT_SETTINGS: Settings = {
  gestureSensitivity: 0.5,
  cursorSpeed: 0.5,
  animationQuality: 'high',
  musicVolume: 0.5,
  sfxVolume: 0.7,
  colorblindMode: false,
  leftHandedMode: false,
};
