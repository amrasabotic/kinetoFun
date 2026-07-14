import { create } from 'zustand';
import type { GameScreen, SaveData, GameSettings, Statistics, GameMode, AIDifficulty, ArenaId, PaddleSkinId, BallSkinId, TrailId } from '../types';
import { defaultSave } from '../constants/gameConfig';

const SAVE_KEY = 'gtta_save_v1';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      return {
        ...base, ...parsed,
        statistics: { ...base.statistics, ...(parsed.statistics ?? {}) },
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
      };
    }
  } catch { /* ignore */ }
  return defaultSave();
}

function persist(save: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

interface GameStore {
  screen: GameScreen;
  save: SaveData;
  pendingMode: GameMode;
  pendingDifficulty: AIDifficulty;
  pendingArena: ArenaId;

  setScreen: (s: GameScreen) => void;
  setPendingMode: (m: GameMode) => void;
  setPendingDifficulty: (d: AIDifficulty) => void;
  setPendingArena: (a: ArenaId) => void;
  updateSettings: (p: Partial<GameSettings>) => void;
  addCoins: (n: number) => void;
  updateStatistics: (p: Partial<Statistics>) => void;
  recordHighScore: (mode: GameMode, score: number) => void;
  unlockPaddle: (id: PaddleSkinId) => void;
  selectPaddle: (id: PaddleSkinId) => void;
  unlockBall: (id: BallSkinId) => void;
  selectBall: (id: BallSkinId) => void;
  unlockTrail: (id: TrailId) => void;
  selectTrail: (id: TrailId) => void;
  updateArcadeProgress: (stage: number) => void;
  resetProgress: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const save = loadSave();
  return {
    screen: 'menu',
    save,
    pendingMode: 'classic',
    pendingDifficulty: save.settings.defaultDifficulty,
    pendingArena: save.settings.defaultArena,

    setScreen: (screen) => set({ screen }),
    setPendingMode: (pendingMode) => set({ pendingMode }),
    setPendingDifficulty: (pendingDifficulty) => set({ pendingDifficulty }),
    setPendingArena: (pendingArena) => set({ pendingArena }),

    updateSettings: (partial) => {
      const next = { ...get().save, settings: { ...get().save.settings, ...partial } };
      persist(next);
      set({ save: next });
    },

    addCoins: (n) => {
      const next = { ...get().save, coins: get().save.coins + n };
      persist(next);
      set({ save: next });
    },

    updateStatistics: (partial) => {
      const next = { ...get().save, statistics: { ...get().save.statistics, ...partial } };
      persist(next);
      set({ save: next });
    },

    recordHighScore: (mode, score) => {
      const existing = get().save.statistics.highScores[mode] ?? 0;
      if (score <= existing) return;
      const next = {
        ...get().save,
        statistics: {
          ...get().save.statistics,
          highScores: { ...get().save.statistics.highScores, [mode]: score },
        },
      };
      persist(next);
      set({ save: next });
    },

    unlockPaddle: (id) => {
      const s = get().save;
      if (s.unlockedPaddles.includes(id)) return;
      const next = { ...s, unlockedPaddles: [...s.unlockedPaddles, id] };
      persist(next); set({ save: next });
    },
    selectPaddle: (id) => {
      const next = { ...get().save, selectedPaddle: id };
      persist(next); set({ save: next });
    },
    unlockBall: (id) => {
      const s = get().save;
      if (s.unlockedBalls.includes(id)) return;
      const next = { ...s, unlockedBalls: [...s.unlockedBalls, id] };
      persist(next); set({ save: next });
    },
    selectBall: (id) => {
      const next = { ...get().save, selectedBall: id };
      persist(next); set({ save: next });
    },
    unlockTrail: (id) => {
      const s = get().save;
      if (s.unlockedTrails.includes(id)) return;
      const next = { ...s, unlockedTrails: [...s.unlockedTrails, id] };
      persist(next); set({ save: next });
    },
    selectTrail: (id) => {
      const next = { ...get().save, selectedTrail: id };
      persist(next); set({ save: next });
    },

    updateArcadeProgress: (stage) => {
      const s = get().save;
      if (stage <= s.arcadeHighestStage) return;
      const next = { ...s, arcadeHighestStage: stage };
      persist(next); set({ save: next });
    },

    resetProgress: () => {
      const fresh = defaultSave();
      persist(fresh);
      set({ save: fresh, screen: 'menu' });
    },
  };
});
