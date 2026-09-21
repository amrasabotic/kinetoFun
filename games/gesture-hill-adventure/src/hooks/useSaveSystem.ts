/** LocalStorage persistence layer for save data. */
import type { SaveData, Statistics, Settings } from '../types';
import { SAVE_KEY } from '../constants/gameConfig';

export function defaultStats(): Statistics {
  return {
    bestDistance:   0,
    highestScore:   0,
    coinsCollected: 0,
    totalPlayTime:  0,
    gamesPlayed:    0,
    flipsPerformed: 0,
    fuelPickups:    0,
  };
}

export function defaultSettings(): Settings {
  return {
    music:              true,
    sound:              true,
    gestureSensitivity: 1.0,
    graphicsQuality:    'high',
  };
}

export function defaultSave(): SaveData {
  return {
    coins:         0,
    unlockedSkins: ['buggy'],
    selectedSkin:  'buggy',
    highScore:     0,
    bestDistance:  0,
    statistics:    defaultStats(),
    settings:      defaultSettings(),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // Merge with defaults so new fields are always present
      return {
        ...defaultSave(),
        ...parsed,
        statistics: { ...defaultStats(), ...(parsed.statistics ?? {}) },
        settings:   { ...defaultSettings(), ...(parsed.settings ?? {}) },
        unlockedSkins: parsed.unlockedSkins ?? ['buggy'],
      };
    }
  } catch {
    // ignore
  }
  return defaultSave();
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

export function resetSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
