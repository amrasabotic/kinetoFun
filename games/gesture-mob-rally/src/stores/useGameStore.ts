import { create } from 'zustand';
import type { Screen, SaveData, Statistics, SaveSettings, CosmeticCategory, GameOverSummary } from '../types';
import { COSMETIC_ITEMS } from '../game/cosmetics/cosmeticDefs';

const SAVE_KEY = 'gmr_save_v1';

function defaultSettings(): SaveSettings {
  return { cameraDeviceId: null, gestureSensitivity: 1, graphicsQuality: 'high', musicVolume: 0.35, sfxVolume: 0.7 };
}

function defaultStatistics(): Statistics {
  return { gamesPlayed: 0, highScore: 0, longestRunLevels: 0, highestCrowd: 0, bossesDefeated: 0, levelsCompleted: 0, totalCoinsEarned: 0 };
}

function defaultSave(): SaveData {
  return {
    coins: 0,
    unlockedCosmetics: ['none-hat', 'none-cape', 'none-trail', 'none-aura', 'blue'],
    selectedCosmetics: { hat: 'none-hat', cape: 'none-cape', trail: 'none-trail', aura: 'none-aura', colorTheme: 'blue' },
    statistics: defaultStatistics(),
    settings: defaultSettings(),
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultSave(),
        ...parsed,
        statistics: { ...defaultStatistics(), ...parsed.statistics },
        settings: { ...defaultSettings(), ...parsed.settings },
        selectedCosmetics: { ...defaultSave().selectedCosmetics, ...parsed.selectedCosmetics },
      };
    }
  } catch { /* ignore */ }
  return defaultSave();
}

function persistSave(save: SaveData): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

interface GameStoreState {
  screen: Screen;
  save: SaveData;
  lastResult: GameOverSummary | null;

  setScreen: (s: Screen) => void;
  addCoins: (n: number) => void;
  updateSettings: (partial: Partial<SaveSettings>) => void;
  purchaseCosmetic: (id: string, category: CosmeticCategory, cost: number) => boolean;
  selectCosmetic: (id: string, category: CosmeticCategory) => void;
  recordGameOver: (summary: GameOverSummary) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'calibrating',
  save: loadSave(),
  lastResult: null,

  setScreen: (screen) => set({ screen }),

  addCoins: (n) => {
    const next = { ...get().save, coins: Math.max(0, get().save.coins + n) };
    persistSave(next);
    set({ save: next });
  },

  updateSettings: (partial) => {
    const next = { ...get().save, settings: { ...get().save.settings, ...partial } };
    persistSave(next);
    set({ save: next });
  },

  purchaseCosmetic: (id, category, cost) => {
    const save = get().save;
    if (save.unlockedCosmetics.includes(id)) return true;
    if (save.coins < cost) return false;
    const next: SaveData = {
      ...save,
      coins: save.coins - cost,
      unlockedCosmetics: [...save.unlockedCosmetics, id],
      selectedCosmetics: { ...save.selectedCosmetics, [category]: id },
    };
    persistSave(next);
    set({ save: next });
    return true;
  },

  selectCosmetic: (id, category) => {
    const save = get().save;
    if (!save.unlockedCosmetics.includes(id)) return;
    const next: SaveData = { ...save, selectedCosmetics: { ...save.selectedCosmetics, [category]: id } };
    persistSave(next);
    set({ save: next });
  },

  recordGameOver: (summary) => {
    const save = get().save;
    const stats = save.statistics;
    const newStats: Statistics = {
      gamesPlayed: stats.gamesPlayed + 1,
      highScore: Math.max(stats.highScore, summary.score),
      longestRunLevels: Math.max(stats.longestRunLevels, summary.levelsCompleted),
      highestCrowd: Math.max(stats.highestCrowd, summary.highestCrowd),
      bossesDefeated: stats.bossesDefeated + summary.bossesDefeated,
      levelsCompleted: stats.levelsCompleted + summary.levelsCompleted,
      totalCoinsEarned: stats.totalCoinsEarned + summary.coinsEarned,
    };
    const next: SaveData = { ...save, coins: save.coins + summary.coinsEarned, statistics: newStats };
    persistSave(next);
    set({ save: next, lastResult: summary });

    try {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: summary.score }, '*');
    } catch { /* ignore */ }
  },
}));

export function cosmeticIsUnlocked(save: SaveData, id: string): boolean {
  return save.unlockedCosmetics.includes(id);
}

export { COSMETIC_ITEMS };
