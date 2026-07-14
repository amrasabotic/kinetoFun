import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SaveData, SessionResult } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestStarsByMode: { percussion: 0, melodic: 0, mixed: 0 },
  sessionsPlayed: 0,
  perfectSessions: 0,
  achievements: [],
};

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-round', title: 'First Round', description: 'Finish your first session.' },
  { id: 'percussion-master', title: 'Percussion Master', description: 'Earn 3 stars in Percussion mode.' },
  { id: 'melodic-master', title: 'Melodic Master', description: 'Earn 3 stars in Melodic mode.' },
  { id: 'mixed-master', title: 'Mixed Master', description: 'Earn 3 stars in Mixed mode.' },
  { id: 'perfect-round', title: 'Perfect Round', description: 'Finish a session with zero mistakes.' },
  { id: 'ten-sessions', title: 'Music Maestro', description: 'Play 10 sessions.' },
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
    { name: 'musical-instrument-sounds-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: SaveData, result: SessionResult): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.sessionsPlayed >= 1) add('first-round');
  if (state.sessionsPlayed >= 10) add('ten-sessions');
  if (result.mistakes === 0) add('perfect-round');
  if (state.bestStarsByMode.percussion >= 3) add('percussion-master');
  if (state.bestStarsByMode.melodic >= 3) add('melodic-master');
  if (state.bestStarsByMode.mixed >= 3) add('mixed-master');

  return out;
}
