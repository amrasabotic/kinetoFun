export interface PlotState {
  cropId: string | null;
  plantedAt: number | null; // epoch ms; null when the plot is empty
}

export interface FarmSaveData {
  version: number;
  coins: number;
  totalCoinsEarned: number; // lifetime, monotonic — submitted to the platform as this game's score
  totalHarvests: number;
  unlockedCropIds: string[];
  unlockedPlotCount: number;
  plots: PlotState[];
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
  isPinching: boolean;
}
