import type { SaveData, Settings } from '../types/GameTypes';

const KEY = 'maze-muncher:save';

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  smoothing: 0.3,
  deadzone: 0.09,
  sound: true,
  musicVolume: 0.35,
  sfxVolume: 0.7,
  highContrast: false,
  colorblindMode: false,
  largeUI: false,
  leftHanded: false,
  showFps: true,
  aimAssist: true,
};

const DEFAULT_SAVE: SaveData = {
  settings: DEFAULT_SETTINGS,
  highScores: [],
  lastCalibration: null,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE, settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      highScores: Array.isArray(parsed.highScores) ? parsed.highScores : [],
      lastCalibration: parsed.lastCalibration ?? null,
    };
  } catch {
    return { ...DEFAULT_SAVE, settings: { ...DEFAULT_SETTINGS } };
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable (private mode / quota) — fail silently */
  }
}

export function recordHighScore(save: SaveData, score: number, level: number): SaveData {
  const entry = { score, level, date: new Date().toISOString() };
  const highScores = [...save.highScores, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const next = { ...save, highScores };
  persistSave(next);
  return next;
}

export function topScore(save: SaveData): number {
  return save.highScores[0]?.score ?? 0;
}
