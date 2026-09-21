import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SaveData, SessionResult } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestStarsByMode: { shape: 0, color: 0, mixed: 0 },
  sessionsPlayed: 0,
  perfectSessions: 0,
  achievements: [],
};

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-sort', title: 'First Sort', description: 'Finish your first session.' },
  { id: 'shape-master', title: 'Shape Master', description: 'Earn 3 stars sorting by shape.' },
  { id: 'color-master', title: 'Color Master', description: 'Earn 3 stars sorting by color.' },
  { id: 'mixed-master', title: 'Mixed Master', description: 'Earn 3 stars in Mixed mode.' },
  { id: 'perfect-round', title: 'Perfect Round', description: 'Finish a session with zero mistakes.' },
  { id: 'ten-sessions', title: 'Super Sorter', description: 'Play 10 sessions.' },
];

interface ProgressState extends SaveData {
  recordSessionResult: (result: SessionResult) => string[]; // returns newly unlocked achievement ids
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
          [result.mode]: Math.max(state.bestStarsByMode[result.mode], result.stars) as 0 | 1 | 2 | 3,
        };
        const sessionsPlayed = state.sessionsPlayed + 1;
        const perfectSessions = state.perfectSessions + (result.mistakes === 0 ? 1 : 0);

        const newState: SaveData = { ...state, bestStarsByMode, sessionsPlayed, perfectSessions };
        const unlocked = computeNewAchievements(state.achievements, newState, result);
        newState.achievements = [...state.achievements, ...unlocked];

        set(newState);
        return unlocked;
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'shape-color-sorter-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: SaveData, result: SessionResult): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.sessionsPlayed >= 1) add('first-sort');
  if (state.sessionsPlayed >= 10) add('ten-sessions');
  if (result.mistakes === 0) add('perfect-round');
  if (state.bestStarsByMode.shape >= 3) add('shape-master');
  if (state.bestStarsByMode.color >= 3) add('color-master');
  if (state.bestStarsByMode.mixed >= 3) add('mixed-master');

  return out;
}
