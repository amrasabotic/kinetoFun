export type ShapeId = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'diamond';

export type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';

export type SortMode = 'shape' | 'color' | 'mixed';

export interface RoundPrompt {
  shape: ShapeId;
  color: ColorId;
}

/** A hover target. In 'shape' mode only `shape` matters, in 'color' mode only `color`, in 'mixed' mode both. */
export interface BinDef {
  id: string;
  shape?: ShapeId;
  color?: ColorId;
  isCorrect: boolean;
}

export interface SessionResult {
  mode: SortMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: 1;
  bestStarsByMode: Record<SortMode, 0 | 1 | 2 | 3>;
  sessionsPlayed: number;
  perfectSessions: number;
  achievements: string[];
}

export interface GestureSettings {
  musicVolume: number;
  sfxVolume: number;
  mirrorCamera: boolean;
  colorblindMode: boolean;
  highContrast: boolean;
  largerCursor: boolean;
  slowerPace: boolean;
  audioNarration: boolean;
}

export interface HandFrame {
  detected: boolean;
  confidence: number;
  cursorX: number;
  cursorY: number;
  indexZ: number;
  isPalmOpen: boolean;
  isFist: boolean;
}
