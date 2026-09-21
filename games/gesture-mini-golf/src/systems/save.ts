import type { Difficulty, GameMode } from '../types';

const STORAGE_KEY = 'kinetofun.gesture-mini-golf.save.v1';

export interface SaveData {
  roundsCompleted: number;
  bestScores: Partial<Record<`${GameMode}:${Difficulty}`, number>>;
  holesInOne: number;
  lastDailyCompletedDate: string | null;
}

const DEFAULT_SAVE: SaveData = {
  roundsCompleted: 0,
  bestScores: {},
  holesInOne: 0,
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

export function recordRound(mode: GameMode, difficulty: Difficulty, leaderboardScore: number, holesInOne: number) {
  const save = loadSave();
  save.roundsCompleted += 1;
  save.holesInOne += holesInOne;
  const key = `${mode}:${difficulty}` as const;
  const best = save.bestScores[key];
  if (best === undefined || leaderboardScore > best) save.bestScores[key] = leaderboardScore;
  if (mode === 'daily') save.lastDailyCompletedDate = new Date().toISOString().slice(0, 10);
  writeSave(save);
  return save;
}

export function hasDailyCompletedToday(): boolean {
  const save = loadSave();
  return save.lastDailyCompletedDate === new Date().toISOString().slice(0, 10);
}
