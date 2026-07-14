export interface PlacedItem {
  itemId: string;
  zoneId: string;
  x: number; // fractional [0,1] position within the zone canvas
  y: number; // fractional [0,1] position within the zone canvas
}

export interface ZooSaveData {
  version: number;
  tickets: number; // spendable balance
  totalTicketsEarned: number; // lifetime, monotonic — submitted to the platform as this game's score
  lastCollectedAt: number;
  unlockedZoneIds: string[];
  unlockedItemIds: string[];
  placedItems: PlacedItem[];
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
