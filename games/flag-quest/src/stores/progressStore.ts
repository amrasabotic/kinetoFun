import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Continent, LevelResult, SaveData } from '../types';
import { ALL_FLAGS, CONTINENT_ORDER, getFlagById, getFlagsByContinent } from '../flags';

const STARS_PER_CONTINENT_UNLOCK = 10;

const DEFAULT_SAVE: SaveData = {
  version: 1,
  unlockedContinents: ['Europe'],
  unlockedCountryIds: [getFlagsByContinent('Europe')[0]?.id ?? ''].filter(Boolean),
  starsByFlag: {},
  bestScoreByFlag: {},
  bestTimeByFlag: {},
  totalStars: 0,
  flagsCompleted: [],
  perfectFlags: [],
  achievements: [],
  endlessBestScore: 0,
};

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-flag', title: 'First Flag', description: 'Complete your first flag.' },
  { id: 'ten-flags', title: '10 Flags', description: 'Complete 10 different flags.' },
  { id: 'all-flags', title: 'World Traveler', description: 'Complete every flag in the atlas.' },
  { id: 'perfect-painter', title: 'Perfect Painter', description: 'Earn a Perfect medal.' },
  { id: 'europe-master', title: 'Europe Master', description: 'Earn 3 stars on every European flag.' },
  { id: 'asia-explorer', title: 'Asia Explorer', description: 'Earn 3 stars on every Asian flag.' },
  { id: 'full-accuracy', title: '100% Accuracy', description: 'Finish a flag with zero mistakes.' },
  { id: 'speed-painter', title: 'Speed Painter', description: 'Finish a flag in half its target time.' },
];

interface ProgressState extends SaveData {
  isContinentUnlocked: (c: Continent) => boolean;
  isCountryUnlocked: (flagId: string) => boolean;
  recordLevelResult: (result: LevelResult) => string[]; // returns newly unlocked achievement ids
  recordEndlessScore: (score: number) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      isContinentUnlocked: (c) => get().unlockedContinents.includes(c),
      isCountryUnlocked: (flagId) => get().unlockedCountryIds.includes(flagId),

      recordEndlessScore: (score) => {
        if (score > get().endlessBestScore) set({ endlessBestScore: score });
      },

      recordLevelResult: (result) => {
        const flag = getFlagById(result.flagId);
        if (!flag) return [];
        const state = get();

        const prevStars = state.starsByFlag[result.flagId] ?? 0;
        const starsByFlag = { ...state.starsByFlag, [result.flagId]: Math.max(prevStars, result.stars) as 0 | 1 | 2 | 3 };
        const bestScoreByFlag = {
          ...state.bestScoreByFlag,
          [result.flagId]: Math.max(state.bestScoreByFlag[result.flagId] ?? 0, result.score),
        };
        const bestTimeByFlag = {
          ...state.bestTimeByFlag,
          [result.flagId]: Math.min(state.bestTimeByFlag[result.flagId] ?? Infinity, result.timeSec),
        };
        const flagsCompleted = state.flagsCompleted.includes(result.flagId)
          ? state.flagsCompleted
          : [...state.flagsCompleted, result.flagId];
        const perfectFlags = result.medal === 'perfect' && !state.perfectFlags.includes(result.flagId)
          ? [...state.perfectFlags, result.flagId]
          : state.perfectFlags;

        const totalStars = Object.values(starsByFlag).reduce((s: number, n) => s + n, 0);

        // Unlock the next country within this continent.
        const continentFlags = getFlagsByContinent(flag.continent);
        const idx = continentFlags.findIndex((f) => f.id === flag.id);
        const unlockedCountryIds = new Set(state.unlockedCountryIds);
        unlockedCountryIds.add(flag.id);
        if (idx >= 0 && idx + 1 < continentFlags.length) {
          unlockedCountryIds.add(continentFlags[idx + 1].id);
        }

        // Unlock continents progressively by total star count.
        const unlockedContinents = new Set(state.unlockedContinents);
        CONTINENT_ORDER.forEach((c, i) => {
          if (totalStars >= i * STARS_PER_CONTINENT_UNLOCK) {
            unlockedContinents.add(c);
            const first = getFlagsByContinent(c)[0];
            if (first) unlockedCountryIds.add(first.id);
          }
        });

        const newState: SaveData = {
          ...state,
          starsByFlag,
          bestScoreByFlag,
          bestTimeByFlag,
          flagsCompleted,
          perfectFlags,
          totalStars,
          unlockedCountryIds: Array.from(unlockedCountryIds),
          unlockedContinents: Array.from(unlockedContinents),
        };

        const unlocked = computeNewAchievements(state.achievements, newState, result);
        newState.achievements = [...state.achievements, ...unlocked];

        set(newState);
        return unlocked;
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'flag-quest-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: SaveData, result: LevelResult): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.flagsCompleted.length >= 1) add('first-flag');
  if (state.flagsCompleted.length >= 10) add('ten-flags');
  if (state.flagsCompleted.length >= ALL_FLAGS.length) add('all-flags');
  if (result.medal === 'perfect') add('perfect-painter');
  if (result.mistakes === 0) add('full-accuracy');
  if (result.timeSec <= result.timeSec && result.timeSec > 0) {
    const flag = getFlagById(result.flagId);
    if (flag && result.timeSec <= flag.targetTimeSec * 0.5) add('speed-painter');
  }
  const europeFlags = getFlagsByContinent('Europe');
  if (europeFlags.every((f) => (state.starsByFlag[f.id] ?? 0) >= 3)) add('europe-master');
  const asiaFlags = getFlagsByContinent('Asia');
  if (asiaFlags.every((f) => (state.starsByFlag[f.id] ?? 0) >= 3)) add('asia-explorer');

  return out;
}
