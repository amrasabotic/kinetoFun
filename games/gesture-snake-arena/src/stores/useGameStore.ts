import { create } from 'zustand';
import type {
  GameScreen, SaveData, Statistics, GameSettings,
  SnakeSkinId, HeadAccessoryId, TrailId
} from '../types';
import {
  SNAKE_SKINS, HEAD_ACCESSORIES, TRAILS, DEFAULT_SETTINGS
} from '../constants/gameConfig';

const SAVE_KEY = 'gsa_save_v1';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSave();
}

function defaultSave(): SaveData {
  return {
    coins: 0,
    selectedSkin: 'default',
    selectedAccessory: 'none',
    selectedTrail: 'none',
    unlockedSkins: ['default'],
    unlockedAccessories: ['none'],
    unlockedTrails: ['none'],
    statistics: {
      highScore: 0,
      longestSnake: 0,
      gamesPlayed: 0,
      totalSurvivalTime: 0,
      totalEnergyCollected: 0,
      aiSnakesDefeated: 0,
      powerUpsCollected: 0,
      boostsUsed: 0,
      comboRecord: 0,
      coinsEarned: 0,
    },
    settings: DEFAULT_SETTINGS,
    highScores: [],
  };
}

function persistSave(save: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

interface GameState {
  screen: GameScreen;
  save: SaveData;

  // Computed from skins
  activeSkinColors: string[];
  activeAccessory: HeadAccessoryId;
  activeTrail: TrailId;

  setScreen: (s: GameScreen) => void;
  setSave: (updater: (prev: SaveData) => SaveData) => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
  updateStatistics: (partial: Partial<Statistics>) => void;
  addCoins: (n: number) => void;
  unlockSkin: (id: SnakeSkinId) => void;
  selectSkin: (id: SnakeSkinId) => void;
  unlockAccessory: (id: HeadAccessoryId) => void;
  selectAccessory: (id: HeadAccessoryId) => void;
  unlockTrail: (id: TrailId) => void;
  selectTrail: (id: TrailId) => void;
  recordGameOver: (score: number, length: number, survivalMs: number, energyCollected: number, aiDefeated: number, powerUps: number, boosts: number, combo: number, coins: number) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  const save = loadSave();
  const skin = SNAKE_SKINS.find(s => s.id === save.selectedSkin) ?? SNAKE_SKINS[0];

  return {
    screen: 'menu',
    save,
    activeSkinColors: skin.colors,
    activeAccessory: save.selectedAccessory,
    activeTrail: save.selectedTrail,

    setScreen: (screen) => set({ screen }),

    setSave: (updater) => {
      const next = updater(get().save);
      persistSave(next);
      const s = SNAKE_SKINS.find(x => x.id === next.selectedSkin) ?? SNAKE_SKINS[0];
      set({ save: next, activeSkinColors: s.colors, activeAccessory: next.selectedAccessory, activeTrail: next.selectedTrail });
    },

    updateSettings: (partial) => {
      const next = { ...get().save, settings: { ...get().save.settings, ...partial } };
      persistSave(next);
      set({ save: next });
    },

    updateStatistics: (partial) => {
      const next = { ...get().save, statistics: { ...get().save.statistics, ...partial } };
      persistSave(next);
      set({ save: next });
    },

    addCoins: (n) => {
      const next = { ...get().save, coins: get().save.coins + n };
      persistSave(next);
      set({ save: next });
    },

    unlockSkin: (id) => {
      const save = get().save;
      if (save.unlockedSkins.includes(id)) return;
      const next = { ...save, unlockedSkins: [...save.unlockedSkins, id] };
      persistSave(next);
      set({ save: next });
    },

    selectSkin: (id) => {
      const save = get().save;
      const next = { ...save, selectedSkin: id };
      const skin = SNAKE_SKINS.find(s => s.id === id) ?? SNAKE_SKINS[0];
      persistSave(next);
      set({ save: next, activeSkinColors: skin.colors });
    },

    unlockAccessory: (id) => {
      const save = get().save;
      if (save.unlockedAccessories.includes(id)) return;
      const next = { ...save, unlockedAccessories: [...save.unlockedAccessories, id] };
      persistSave(next);
      set({ save: next });
    },

    selectAccessory: (id) => {
      const save = get().save;
      const next = { ...save, selectedAccessory: id };
      persistSave(next);
      set({ save: next, activeAccessory: id });
    },

    unlockTrail: (id) => {
      const save = get().save;
      if (save.unlockedTrails.includes(id)) return;
      const next = { ...save, unlockedTrails: [...save.unlockedTrails, id] };
      persistSave(next);
      set({ save: next });
    },

    selectTrail: (id) => {
      const save = get().save;
      const next = { ...save, selectedTrail: id };
      persistSave(next);
      set({ save: next, activeTrail: id });
    },

    recordGameOver: (score, length, survivalMs, energyCollected, aiDefeated, powerUps, boosts, combo, coins) => {
      const save = get().save;
      const stats = save.statistics;
      const newStats: Statistics = {
        highScore: Math.max(stats.highScore, score),
        longestSnake: Math.max(stats.longestSnake, length),
        gamesPlayed: stats.gamesPlayed + 1,
        totalSurvivalTime: stats.totalSurvivalTime + survivalMs,
        totalEnergyCollected: stats.totalEnergyCollected + energyCollected,
        aiSnakesDefeated: stats.aiSnakesDefeated + aiDefeated,
        powerUpsCollected: stats.powerUpsCollected + powerUps,
        boostsUsed: stats.boostsUsed + boosts,
        comboRecord: Math.max(stats.comboRecord, combo),
        coinsEarned: stats.coinsEarned + coins,
      };
      const newHighScores = [...save.highScores, score].sort((a,b)=>b-a).slice(0,10);
      const next = { ...save, coins: save.coins + coins, statistics: newStats, highScores: newHighScores };
      persistSave(next);
      set({ save: next });

      // Report to KinetoFun parent
      try {
        window.parent.postMessage({ type: 'GAME_COMPLETE', score, metadata: { length, survivalMs } }, '*');
      } catch { /* ignore */ }
    },
  };
});
