import type { GameMode, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'kinetofun.liquid-puzzle.save.v1';

export interface DailyResult {
  timeMs: number;
  moves: number;
  hintsUsed: number;
}

export interface Statistics {
  gamesPlayed: number;
  gamesWon: number;
  totalMoves: number;
  fastestSolveMs: number | null;
  currentStreak: number;
  longestStreak: number;
  hintsUsed: number;
  undosUsed: number;
  modePlayCounts: Record<GameMode, number>;
}

export interface SaveData {
  settings: Settings;
  stats: Statistics;
  levelStars: Record<number, 1 | 2 | 3>;
  highestLevelUnlocked: number;
  endlessHighestLevel: number;
  dailyCompletions: Record<string, DailyResult>; // ISO date -> result, one entry per day played
}

const DEFAULT_SAVE: SaveData = {
  settings: DEFAULT_SETTINGS,
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalMoves: 0,
    fastestSolveMs: null,
    currentStreak: 0,
    longestStreak: 0,
    hintsUsed: 0,
    undosUsed: 0,
    modePlayCounts: { levels: 0, endless: 0, daily: 0 },
  },
  levelStars: {},
  highestLevelUnlocked: 1,
  endlessHighestLevel: 0,
  dailyCompletions: {},
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      stats: { ...structuredClone(DEFAULT_SAVE.stats), ...parsed.stats },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — progress simply won't persist this session.
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hasDailyCompletedToday(): boolean {
  return todayIso() in loadSave().dailyCompletions;
}

/** Records a won level puzzle (Levels or Daily mode): updates stats, best stars, streak, and unlocks the next level. */
export function recordLevelWin(
  mode: GameMode,
  level: number,
  stars: 1 | 2 | 3,
  moves: number,
  hintsUsed: number,
  undosUsed: number,
  elapsedMs: number,
): SaveData {
  const save = loadSave();
  save.stats.gamesPlayed += 1;
  save.stats.gamesWon += 1;
  save.stats.totalMoves += moves;
  save.stats.hintsUsed += hintsUsed;
  save.stats.undosUsed += undosUsed;
  save.stats.currentStreak += 1;
  save.stats.longestStreak = Math.max(save.stats.longestStreak, save.stats.currentStreak);
  save.stats.modePlayCounts[mode] = (save.stats.modePlayCounts[mode] ?? 0) + 1;
  if (save.stats.fastestSolveMs === null || elapsedMs < save.stats.fastestSolveMs) {
    save.stats.fastestSolveMs = elapsedMs;
  }

  if (mode === 'levels') {
    const best = save.levelStars[level];
    if (best === undefined || stars > best) save.levelStars[level] = stars;
    save.highestLevelUnlocked = Math.max(save.highestLevelUnlocked, level + 1);
  }

  if (mode === 'daily') {
    save.dailyCompletions[todayIso()] = { timeMs: elapsedMs, moves, hintsUsed };
  }

  writeSave(save);
  return save;
}

export function recordEndlessLevel(level: number): SaveData {
  const save = loadSave();
  save.stats.modePlayCounts.endless = (save.stats.modePlayCounts.endless ?? 0) + 1;
  save.endlessHighestLevel = Math.max(save.endlessHighestLevel, level);
  writeSave(save);
  return save;
}

/** Recorded whenever a puzzle is abandoned/reset without solving — breaks the win streak without counting as a loss-loss stat elsewhere. */
export function recordAbandoned(): SaveData {
  const save = loadSave();
  save.stats.gamesPlayed += 1;
  save.stats.currentStreak = 0;
  writeSave(save);
  return save;
}

export function updateSettings(partial: Partial<Settings>): SaveData {
  const save = loadSave();
  save.settings = { ...save.settings, ...partial };
  writeSave(save);
  return save;
}

export function resetProgress(): SaveData {
  const fresh = structuredClone(DEFAULT_SAVE);
  writeSave(fresh);
  return fresh;
}
