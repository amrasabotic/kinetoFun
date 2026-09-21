import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SaveData, SessionResult } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestStarsByMode: { small: 0, medium: 0, big: 0 },
  sessionsPlayed: 0,
  perfectSessions: 0,
  achievements: [],
};

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-match', title: 'First Match', description: 'Finish your first board.' },
  { id: 'small-master', title: 'Small Zoo Master', description: 'Earn 3 stars in Small Zoo mode.' },
  { id: 'medium-master', title: 'Medium Zoo Master', description: 'Earn 3 stars in Medium Zoo mode.' },
  { id: 'big-master', title: 'Big Zoo Master', description: 'Earn 3 stars in Big Zoo mode.' },
  { id: 'perfect-memory', title: 'Perfect Memory', description: 'Clear a board with zero mismatches.' },
  { id: 'memory-champion', title: 'Memory Champion', description: 'Play 10 sessions.' },
];

interface ProgressState extends SaveData {
  recordSessionResult: (result: SessionResult) => string[];
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      recordSessionResult: (result) => {
        const state = get();
        const bestStarsByMode = {
          ...state.bestStarsByMode,
          [result.size]: Math.max(state.bestStarsByMode[result.size], result.stars) as 0 | 1 | 2 | 3,
        };
        const sessionsPlayed = state.sessionsPlayed + 1;
        const perfectSessions = state.perfectSessions + (result.mismatches === 0 ? 1 : 0);

        const newState: SaveData = { ...state, bestStarsByMode, sessionsPlayed, perfectSessions };
        const unlocked = computeNewAchievements(state.achievements, newState, result);
        newState.achievements = [...state.achievements, ...unlocked];

        set(newState);
        return unlocked;
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'memory-match-zoo-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: SaveData, result: SessionResult): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.sessionsPlayed >= 1) add('first-match');
  if (state.sessionsPlayed >= 10) add('memory-champion');
  if (result.mismatches === 0) add('perfect-memory');
  if (state.bestStarsByMode.small >= 3) add('small-master');
  if (state.bestStarsByMode.medium >= 3) add('medium-master');
  if (state.bestStarsByMode.big >= 3) add('big-master');

  return out;
}
