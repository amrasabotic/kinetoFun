export interface PetSaveData {
  version: number;
  hunger: number; // 40-100
  happiness: number; // 40-100
  lastHungerTickAt: number;
  lastHappinessTickAt: number;
  hearts: number;
  totalHeartsEarned: number; // lifetime, monotonic — submitted to the platform as this game's score
  totalCareActions: number;
  unlockedItemIds: string[];
  equippedAccessories: string[];
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
