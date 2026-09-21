import type { Difficulty, GameMode, PlayerId } from '../types';

const STORAGE_KEY = 'kinetofun.gesture-darts.save.v1';

export interface SaveData {
  matchesPlayed: number;
  wins: number;
  lastDailyCompletedDate: string | null;
  bestScorePerMode: Partial<Record<`${GameMode}:${Difficulty}`, number>>;
}

const DEFAULT_SAVE: SaveData = {
  matchesPlayed: 0,
  wins: 0,
  lastDailyCompletedDate: null,
  bestScorePerMode: {},
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

export function recordMatch(
  mode: GameMode,
  difficulty: Difficulty,
  winner: PlayerId,
  totalPointsScored: number,
  isDaily: boolean,
) {
  const save = loadSave();
  save.matchesPlayed += 1;
  if (winner === 'you') save.wins += 1;
  const key = `${mode}:${difficulty}` as const;
  const best = save.bestScorePerMode[key];
  if (best === undefined || totalPointsScored > best) save.bestScorePerMode[key] = totalPointsScored;
  if (isDaily) save.lastDailyCompletedDate = new Date().toISOString().slice(0, 10);
  writeSave(save);
  return save;
}

export function hasDailyCompletedToday(): boolean {
  const save = loadSave();
  return save.lastDailyCompletedDate === new Date().toISOString().slice(0, 10);
}
