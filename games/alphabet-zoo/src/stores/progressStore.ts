import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SaveData, SessionResult } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestStarsByMode: { letter: 0, animal: 0, mixed: 0 },
  sessionsPlayed: 0,
  perfectSessions: 0,
  lettersSeen: [],
  achievements: [],
};

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-round', title: 'First Round', description: 'Finish your first session.' },
  { id: 'letter-master', title: 'Letter Master', description: 'Earn 3 stars in Letter Match mode.' },
  { id: 'animal-master', title: 'Animal Master', description: 'Earn 3 stars in Animal Sounds mode.' },
  { id: 'mixed-master', title: 'Mixed Master', description: 'Earn 3 stars in Mixed mode.' },
  { id: 'perfect-round', title: 'Perfect Round', description: 'Finish a session with zero mistakes.' },
  { id: 'ten-sessions', title: 'Little Scholar', description: 'Play 10 sessions.' },
  { id: 'a-to-z', title: 'A to Z', description: 'See all 26 letters as prompts.' },
];

interface ProgressState extends SaveData {
  recordSessionResult: (result: SessionResult) => string[]; // returns newly unlocked achievement ids
  updateLettersSeen: (letter: string) => void;
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

        const newState: SaveData = { ...state, bestStarsByMode, sessionsPlayed, perfectSessions, lettersSeen: state.lettersSeen };
        const unlocked = computeNewAchievements(state.achievements, newState, result, state.lettersSeen);
        newState.achievements = [...state.achievements, ...unlocked];

        set(newState);
        return unlocked;
      },

      updateLettersSeen: (letter) => {
        const state = get();
        if (!state.lettersSeen.includes(letter)) {
          set({ lettersSeen: [...state.lettersSeen, letter] });
        }
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'alphabet-zoo-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: SaveData, result: SessionResult, lettersSeen: string[]): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.sessionsPlayed >= 1) add('first-round');
  if (state.sessionsPlayed >= 10) add('ten-sessions');
  if (result.mistakes === 0) add('perfect-round');
  if (state.bestStarsByMode.letter >= 3) add('letter-master');
  if (state.bestStarsByMode.animal >= 3) add('animal-master');
  if (state.bestStarsByMode.mixed >= 3) add('mixed-master');
  if (lettersSeen.length >= 26) add('a-to-z');

  return out;
}
