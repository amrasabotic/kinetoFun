import type { Difficulty, GameMode } from '../types';

const STORAGE_KEY = 'kinetofun.gesture-sudoku.save.v1';

export interface SaveData {
  puzzlesCompleted: number;
  bestScores: Partial<Record<`${GameMode}:${Difficulty}`, number>>;
  lastDailyCompletedDate: string | null;
}

const DEFAULT_SAVE: SaveData = {
  puzzlesCompleted: 0,
  bestScores: {},
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

export function recordPuzzle(mode: GameMode, difficulty: Difficulty, score: number) {
  const save = loadSave();
  save.puzzlesCompleted += 1;
  const key = `${mode}:${difficulty}` as const;
  const best = save.bestScores[key];
  if (best === undefined || score > best) save.bestScores[key] = score;
  if (mode === 'daily') save.lastDailyCompletedDate = new Date().toISOString().slice(0, 10);
  writeSave(save);
  return save;
}

export function hasDailyCompletedToday(): boolean {
  const save = loadSave();
  return save.lastDailyCompletedDate === new Date().toISOString().slice(0, 10);
}
