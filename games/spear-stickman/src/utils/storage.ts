import { DEFAULT_SETTINGS, type Settings } from './constants';
import { ACHIEVEMENTS, type AchStat } from '../data/achievements';

const PROGRESS_KEY = 'spear-stickman:progress';
const SETTINGS_KEY = 'spear-stickman:settings';

export interface Progress {
  coins: number;
  highScore: Record<string, number>;   // modeId → best score
  bestWave: number;
  unlockedSkins: string[];
  selectedSkin: string;
  achievements: string[];               // unlocked achievement ids
  stats: AchStat;
}

const DEFAULT_PROGRESS: Progress = {
  coins: 0,
  highScore: {},
  bestWave: 0,
  unlockedSkins: ['wood'],
  selectedSkin: 'wood',
  achievements: [],
  stats: { totalKills: 0, totalHeadshots: 0, bestWave: 0, bestCombo: 0, bossKills: 0, perfectWaves: 0 },
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      ...structuredClone(DEFAULT_PROGRESS),
      ...p,
      stats: { ...DEFAULT_PROGRESS.stats, ...(p.stats ?? {}) },
      unlockedSkins: p.unlockedSkins?.length ? p.unlockedSkins : ['wood'],
      highScore: p.highScore ?? {},
      achievements: p.achievements ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** The per-run numbers the engine reports at game over. */
export interface RunOutcome {
  modeId: string;
  score: number;
  wave: number;
  kills: number;
  headshots: number;
  bossKills: number;
  maxCombo: number;
  perfectWaves: number;
  coinsEarned: number;
}

/** Merge a finished run into progress; returns the new progress + newly unlocked achievements. */
export function recordRun(p: Progress, r: RunOutcome): { progress: Progress; unlocked: string[] } {
  const stats: AchStat = {
    totalKills: p.stats.totalKills + r.kills,
    totalHeadshots: p.stats.totalHeadshots + r.headshots,
    bossKills: p.stats.bossKills + r.bossKills,
    perfectWaves: p.stats.perfectWaves + r.perfectWaves,
    bestWave: Math.max(p.stats.bestWave, r.wave),
    bestCombo: Math.max(p.stats.bestCombo, r.maxCombo),
  };
  const next: Progress = {
    ...p,
    coins: p.coins + r.coinsEarned,
    bestWave: Math.max(p.bestWave, r.wave),
    highScore: { ...p.highScore, [r.modeId]: Math.max(p.highScore[r.modeId] ?? 0, r.score) },
    stats,
  };
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!next.achievements.includes(a.id) && a.check(stats)) {
      next.achievements = [...next.achievements, a.id];
      unlocked.push(a.id);
    }
  }
  saveProgress(next);
  return { progress: next, unlocked };
}

export function buySkin(p: Progress, skinId: string, cost: number): Progress {
  if (p.unlockedSkins.includes(skinId) || p.coins < cost) return p;
  const next: Progress = {
    ...p,
    coins: p.coins - cost,
    unlockedSkins: [...p.unlockedSkins, skinId],
    selectedSkin: skinId,
  };
  saveProgress(next);
  return next;
}

export function selectSkin(p: Progress, skinId: string): Progress {
  if (!p.unlockedSkins.includes(skinId)) return p;
  const next = { ...p, selectedSkin: skinId };
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
