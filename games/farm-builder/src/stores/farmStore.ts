import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FarmSaveData, PlotState } from '../types';
import { CROPS, FREE_PLOT_COUNT, MAX_PLOT_COUNT, cropById, plotUnlockCost } from '../data/crops';
import { getGrowthFraction } from '../game/growth';

export interface AchievementDef { id: string; title: string; description: string }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-harvest', title: 'First Harvest', description: 'Harvest your first crop.' },
  { id: 'green-thumb', title: 'Green Thumb', description: 'Harvest 25 crops in total.' },
  { id: 'full-table', title: 'Full Table', description: 'Unlock every crop type.' },
  { id: 'land-baron', title: 'Land Baron', description: 'Unlock every plot.' },
  { id: 'century-farmer', title: 'Century Farmer', description: 'Earn 100 coins in total.' },
  { id: 'master-grower', title: 'Master Grower', description: 'Have every unlocked plot planted at once.' },
];

function emptyPlots(): PlotState[] {
  return Array.from({ length: MAX_PLOT_COUNT }, () => ({ cropId: null, plantedAt: null }));
}

const DEFAULT_SAVE: FarmSaveData = {
  version: 1,
  coins: 10,
  totalCoinsEarned: 0,
  totalHarvests: 0,
  unlockedCropIds: ['carrot'],
  unlockedPlotCount: FREE_PLOT_COUNT,
  plots: emptyPlots(),
  achievements: [],
};

interface FarmState extends FarmSaveData {
  plantCrop: (plotIndex: number, cropId: string) => boolean;
  harvestCrop: (plotIndex: number) => { earned: number; newAchievements: string[] } | null;
  unlockCrop: (cropId: string) => boolean;
  buyPlot: () => boolean;
  resetProgress: () => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SAVE,

      plantCrop: (plotIndex, cropId) => {
        const state = get();
        const crop = cropById(cropId);
        if (!crop) return false;
        if (plotIndex < 0 || plotIndex >= state.unlockedPlotCount) return false;
        if (!state.unlockedCropIds.includes(cropId)) return false;
        if (state.plots[plotIndex].cropId !== null) return false;
        if (state.coins < crop.seedCost) return false;

        const plots = [...state.plots];
        plots[plotIndex] = { cropId, plantedAt: Date.now() };
        set({ coins: state.coins - crop.seedCost, plots });
        return true;
      },

      harvestCrop: (plotIndex) => {
        const state = get();
        const plot = state.plots[plotIndex];
        if (!plot.cropId || plot.plantedAt === null) return null;
        const crop = cropById(plot.cropId);
        if (!crop) return null;
        const fraction = getGrowthFraction(plot.plantedAt, crop.growMs, Date.now());
        if (fraction < 1) return null;

        const plots = [...state.plots];
        plots[plotIndex] = { cropId: null, plantedAt: null };
        const coins = state.coins + crop.sellValue;
        const totalCoinsEarned = state.totalCoinsEarned + crop.sellValue;
        const totalHarvests = state.totalHarvests + 1;

        const newState: FarmSaveData = { ...state, coins, totalCoinsEarned, totalHarvests, plots };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];

        set(newState);
        return { earned: crop.sellValue, newAchievements };
      },

      unlockCrop: (cropId) => {
        const state = get();
        const crop = cropById(cropId);
        if (!crop) return false;
        if (state.unlockedCropIds.includes(cropId)) return false;
        if (state.coins < crop.unlockCost) return false;

        const unlockedCropIds = [...state.unlockedCropIds, cropId];
        const newState: FarmSaveData = { ...state, coins: state.coins - crop.unlockCost, unlockedCropIds };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      buyPlot: () => {
        const state = get();
        if (state.unlockedPlotCount >= MAX_PLOT_COUNT) return false;
        const cost = plotUnlockCost(state.unlockedPlotCount);
        if (state.coins < cost) return false;

        const newState: FarmSaveData = { ...state, coins: state.coins - cost, unlockedPlotCount: state.unlockedPlotCount + 1 };
        const newAchievements = computeNewAchievements(state.achievements, newState);
        newState.achievements = [...state.achievements, ...newAchievements];
        set(newState);
        return true;
      },

      resetProgress: () => set(DEFAULT_SAVE),
    }),
    { name: 'farm-builder-progress' },
  ),
);

function computeNewAchievements(existing: string[], state: FarmSaveData): string[] {
  const has = (id: string) => existing.includes(id);
  const out: string[] = [];
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  if (state.totalHarvests >= 1) add('first-harvest');
  if (state.totalHarvests >= 25) add('green-thumb');
  if (state.unlockedCropIds.length >= CROPS.length) add('full-table');
  if (state.unlockedPlotCount >= MAX_PLOT_COUNT) add('land-baron');
  if (state.totalCoinsEarned >= 100) add('century-farmer');
  if (state.plots.slice(0, state.unlockedPlotCount).every((p) => p.cropId !== null)) add('master-grower');

  return out;
}
