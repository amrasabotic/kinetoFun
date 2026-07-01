export type LetterGameMode = 'letter' | 'animal' | 'mixed';

export interface RoundPrompt {
  letter: string; // A-Z
}

export interface BinDef {
  id: string;
  letter: string;
  isCorrect: boolean;
}

export interface SessionResult {
  mode: LetterGameMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: number;
  bestStarsByMode: Record<LetterGameMode, 0 | 1 | 2 | 3>;
  sessionsPlayed: number;
  perfectSessions: number;
  lettersSeen: string[];
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
