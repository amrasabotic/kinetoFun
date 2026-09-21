import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PetSaveData } from '../types';
import { CARE_ITEMS } from '../data/careItems';

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'new-best-friend', title: 'New Best Friend', description: 'Care for your pal for the first time.' },
  { id: 'best-buddy', title: 'Best Buddy', description: 'Perform 50 total care actions.' },
  { id: 'all-grown-up', title: 'All Grown Up', description: 'Reach the final growth stage.' },
  { id: 'full-closet', title: 'Full Closet', description: 'Unlock every food, toy, and accessory.' },
  { id: 'heart-of-gold', title: 'Heart of Gold', description: 'Earn 100 Hearts total.' },
  { id: 'picture-perfect', title: 'Picture Perfect', description: 'Get Hunger and Happiness to 100 at the same time.' },
];

const DEFAULT_SAVE: PetSaveData = {
  version: 1,
  hunger: 100,
  happiness: 100,
  lastHungerTickAt: Date.now(),
  lastHappinessTickAt: Date.now(),
  hearts: 5,
  totalHeartsEarned: 0,
  totalCareActions: 0,
  unlockedItemIds: ['treat', 'ball'],
  equippedAccessories: [],
  achievements: [],
};

interface PetState extends PetSaveData {
  feedPet: (itemId: string) => boolean;
  playWithPet: (itemId: string) => boolean;
  petPat: () => boolean;
  unlockItem: (itemId: string) => boolean;
  equipAccessory: (itemId: string) => void;
  resetProgress: () => void;
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      feedPet: (itemId) => {
        const state = get();
        const item = CARE_ITEMS.find((i) => i.id === itemId && i.kind === 'food');
        if (!item || !state.unlockedItemIds.includes(itemId)) return false;

        const now = Date.now();
        const newHunger = Math.min(100, state.hunger + item.restoreAmount);
        const newCareActions = state.totalCareActions + 1;
        const hearts = state.hearts + 1;
        const totalHeartsEarned = state.totalHeartsEarned + 1;

        const newState: PetSaveData = {
          ...state,
          hunger: newHunger,
          lastHungerTickAt: now,
          hearts,
          totalHeartsEarned,
          totalCareActions: newCareActions,
        };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      playWithPet: (itemId) => {
        const state = get();
        const item = CARE_ITEMS.find((i) => i.id === itemId && i.kind === 'toy');
        if (!item || !state.unlockedItemIds.includes(itemId)) return false;

        const now = Date.now();
        const newHappiness = Math.min(100, state.happiness + item.restoreAmount);
        const newCareActions = state.totalCareActions + 1;
        const hearts = state.hearts + 1;
        const totalHeartsEarned = state.totalHeartsEarned + 1;

        const newState: PetSaveData = {
          ...state,
          happiness: newHappiness,
          lastHappinessTickAt: now,
          hearts,
          totalHeartsEarned,
          totalCareActions: newCareActions,
        };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      petPat: () => {
        const state = get();
        const now = Date.now();
        const newHappiness = Math.min(100, state.happiness + 15);
        const newCareActions = state.totalCareActions + 1;
        const hearts = state.hearts + 1;
        const totalHeartsEarned = state.totalHeartsEarned + 1;

        const newState: PetSaveData = {
          ...state,
          happiness: newHappiness,
          lastHappinessTickAt: now,
          hearts,
          totalHeartsEarned,
          totalCareActions: newCareActions,
        };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      unlockItem: (itemId) => {
        const state = get();
        const item = CARE_ITEMS.find((i) => i.id === itemId);
        if (!item || state.unlockedItemIds.includes(itemId)) return false;
        if (state.hearts < item.unlockCost) return false;

        const unlockedItemIds = [...state.unlockedItemIds, itemId];
        const newState: PetSaveData = { ...state, hearts: state.hearts - item.unlockCost, unlockedItemIds };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      equipAccessory: (itemId) => {
        const state = get();
        const item = CARE_ITEMS.find((i) => i.id === itemId && i.kind === 'accessory');
        if (!item || !state.unlockedItemIds.includes(itemId)) return;

        const isEquipped = state.equippedAccessories.includes(itemId);
        const equippedAccessories = isEquipped
          ? state.equippedAccessories.filter((id) => id !== itemId)
          : [...state.equippedAccessories, itemId];
        set({ equippedAccessories });
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'pocket-pal-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: PetSaveData): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.totalCareActions >= 1) add('new-best-friend');
  if (state.totalCareActions >= 50) add('best-buddy');
  if (state.totalCareActions >= 100) add('all-grown-up');
  if (state.unlockedItemIds.length >= CARE_ITEMS.length) add('full-closet');
  if (state.totalHeartsEarned >= 100) add('heart-of-gold');

  return out;
}
