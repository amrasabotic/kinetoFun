import type { Difficulty, GameMode } from '../types';

const STORAGE_KEY = 'kinetofun.word-search-hidden-words.save.v1';

export interface SaveData {
  completedLevels: number;
  bestTimesSeconds: Partial<Record<`${GameMode}:${Difficulty}`, number>>;
  hintsUsed: number;
  lastDailyCompletedDate: string | null;
}

const DEFAULT_SAVE: SaveData = {
  completedLevels: 0,
  bestTimesSeconds: {},
  hintsUsed: 0,
  lastDailyCompletedDate: null,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — progress simply won't persist this session.
  }
}

export function recordCompletion(mode: GameMode, difficulty: Difficulty, seconds: number, hintsUsed: number) {
  const save = loadSave();
  save.completedLevels += 1;
  save.hintsUsed += hintsUsed;
  const key = `${mode}:${difficulty}` as const;
  const best = save.bestTimesSeconds[key];
  if (best === undefined || seconds < best) save.bestTimesSeconds[key] = seconds;
  if (mode === 'daily') save.lastDailyCompletedDate = new Date().toISOString().slice(0, 10);
  writeSave(save);
  return save;
}

export function hasDailyCompletedToday(): boolean {
  const save = loadSave();
  return save.lastDailyCompletedDate === new Date().toISOString().slice(0, 10);
}
