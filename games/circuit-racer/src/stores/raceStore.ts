import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CircuitRacerSaveData } from '../types';

const DEFAULT_SAVE: CircuitRacerSaveData = {
  version: 1,
  totalCoinsEarned: 0,
  unlockedCourses: ['c1'],
  courseProgress: {},
  achievements: [],
};

interface RaceState extends CircuitRacerSaveData {
  completeCourse: (courseId: string, position: number, coins: number) => boolean;
  unlockCourse: (courseId: string) => void;
  resetProgress: () => void;
}

export const useRaceStore = create<RaceState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      completeCourse: (courseId, position, coins) => {
        const state = get();
        const stars = position === 1 ? 3 : position === 2 ? 2 : 1;
        const progress = state.courseProgress[courseId] || { stars: 0, bestTime: Infinity };

        set({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: {
              stars: Math.max(progress.stars, stars),
              bestTime: progress.bestTime,
            },
          },
          totalCoinsEarned: state.totalCoinsEarned + coins,
        });

        // Unlock next course
        if (position <= 2) {
          const courseIndex = state.unlockedCourses.length;
          if (courseIndex < 6) {
            set({
              unlockedCourses: [...state.unlockedCourses, `c${courseIndex + 1}`],
            });
          }
        }

        return true;
      },

      unlockCourse: (courseId) => {
        const state = get();
        if (!state.unlockedCourses.includes(courseId)) {
          set({
            unlockedCourses: [...state.unlockedCourses, courseId],
          });
        }
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'circuit-racer-progress' },
  ),
);
