import { create } from 'zustand';
import type { LeaderboardEntry, GameOverSummary } from '../types';

const LEADERBOARD_KEY = 'gmr_leaderboard_v1';
const MAX_ENTRIES = 10;

function loadEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function persistEntries(entries: LeaderboardEntry[]): void {
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

interface LeaderboardStoreState {
  entries: LeaderboardEntry[];
  addResult: (summary: GameOverSummary) => void;
}

export const useLeaderboardStore = create<LeaderboardStoreState>((set, get) => ({
  entries: loadEntries(),
  addResult: (summary) => {
    const entry: LeaderboardEntry = {
      score: summary.score,
      levelsCompleted: summary.levelsCompleted,
      highestCrowd: summary.highestCrowd,
      bossesDefeated: summary.bossesDefeated,
      date: Date.now(),
    };
    const next = [...get().entries, entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    persistEntries(next);
    set({ entries: next });
  },
}));
