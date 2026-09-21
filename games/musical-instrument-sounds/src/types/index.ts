import type { InstrumentId } from '../data/instruments';

export type InstrumentGameMode = 'percussion' | 'melodic' | 'mixed';

export interface RoundPrompt {
  instrumentId: InstrumentId;
}

export interface BinDef {
  id: string;
  instrumentId: InstrumentId;
  isCorrect: boolean;
}

export interface SessionResult {
  mode: InstrumentGameMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: number;
  bestStarsByMode: Record<InstrumentGameMode, 0 | 1 | 2 | 3>;
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
