import type { OppositeGlyph } from '../data/opposites';

export type OppositeGameMode = 'word' | 'picture' | 'mixed';

export interface RoundPrompt {
  pairId: string;
  word: string;
  glyph: OppositeGlyph;
  correctWord: string;
  correctGlyph: OppositeGlyph;
  presentation: 'word' | 'picture';
}

export interface BinDef {
  id: string;
  word: string;
  glyph: OppositeGlyph;
  isCorrect: boolean;
}

export interface SessionResult {
  mode: OppositeGameMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: number;
  bestStarsByMode: Record<OppositeGameMode, 0 | 1 | 2 | 3>;
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
