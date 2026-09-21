export type ClockGameMode = 'read' | 'set' | 'mixed';

export interface TimeValue {
  hour: number; // 1-12
  minute: 0 | 15 | 30 | 45;
}

export interface RoundPrompt {
  time: TimeValue;
  /** Which presentation the prompt uses this round ('clock' or 'digital'); only meaningful in 'mixed' mode. */
  presentation: 'clock' | 'digital';
}

export interface BinDef {
  id: string;
  time: TimeValue;
  isCorrect: boolean;
}

export interface SessionResult {
  mode: ClockGameMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: number;
  bestStarsByMode: Record<ClockGameMode, 0 | 1 | 2 | 3>;
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
