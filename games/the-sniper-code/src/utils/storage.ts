import { DEFAULT_SETTINGS, type Settings } from './constants';

const PROGRESS_KEY = 'sniper-code:progress';
const SETTINGS_KEY = 'sniper-code:settings';

export interface Progress {
  /** missionId → stars (0–3, 0 = unattempted/locked) */
  stars: Record<string, number>;
  /** missionId → best score */
  best: Record<string, number>;
  /** highest mission index unlocked (0-based) */
  unlocked: number;
  endlessHigh: number;
}

const DEFAULT_PROGRESS: Progress = { stars: {}, best: {}, unlocked: 0, endlessHigh: 0 };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Progress) };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function recordMission(
  p: Progress,
  missionId: string,
  missionIndex: number,
  stars: number,
  score: number,
  totalMissions: number,
): Progress {
  const next: Progress = {
    ...p,
    stars: { ...p.stars, [missionId]: Math.max(p.stars[missionId] ?? 0, stars) },
    best: { ...p.best, [missionId]: Math.max(p.best[missionId] ?? 0, score) },
  };
  if (stars >= 1) {
    next.unlocked = Math.min(totalMissions - 1, Math.max(p.unlocked, missionIndex + 1));
  }
  saveProgress(next);
  return next;
}

export function recordEndless(p: Progress, score: number): Progress {
  const next = { ...p, endlessHigh: Math.max(p.endlessHigh, score) };
  saveProgress(next);
  return next;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
