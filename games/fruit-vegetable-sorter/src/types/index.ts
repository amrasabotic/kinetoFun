import type { ProduceId } from '../data/produce';

export type ProduceGameMode = 'fruit' | 'vegetable' | 'mixed';

export interface RoundPrompt {
  produceId: ProduceId;
}

export interface BinDef {
  id: string;
  category: 'fruit' | 'vegetable';
  isCorrect: boolean;
}

export interface SessionResult {
  mode: ProduceGameMode;
  rounds: number;
  correctFirstTry: number;
  mistakes: number;
  avgTimeSec: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
}

export interface SaveData {
  version: number;
  bestStarsByMode: Record<ProduceGameMode, 0 | 1 | 2 | 3>;
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
