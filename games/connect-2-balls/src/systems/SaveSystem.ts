import { PlayerProgress, GameSettings } from '../data/types';

const SAVE_KEY = 'kinetofun_progress';
const SETTINGS_KEY = 'kinetofun_settings';

const defaultProgress: PlayerProgress = {
  currentLevel: 1,
  completedLevels: {},
  totalStars: 0,
  hints: 5,
  achievements: [],
  unlockedThemes: ['forest'],
  unlockedCursors: ['default'],
  unlockedPaths: ['default'],
  selectedTheme: 'forest',
  selectedCursor: 'default',
  selectedPath: 'default',
  combo: 0,
  dailyChallengeHistory: {},
};

const defaultSettings: GameSettings = {
  sensitivity: 1.0,
  leftHanded: false,
  largeCursor: false,
  colorblindMode: false,
  highContrast: false,
  reducedParticles: false,
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,
};

export function loadProgress(): PlayerProgress {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      return { ...defaultProgress, ...JSON.parse(saved) };
    }
  } catch { /* ignore */ }
  return { ...defaultProgress };
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch { /* ignore */ }
  return { ...defaultSettings };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function resetProgress(): void {
  localStorage.removeItem(SAVE_KEY);
}
