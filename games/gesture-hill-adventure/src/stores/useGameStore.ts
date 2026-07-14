/**
 * Zustand store — manages screens, save data, and post-run statistics.
 * Real-time physics state lives in refs inside useGameEngine.
 */
import { create } from 'zustand';
import type { Screen, SaveData, GameOverResult, Settings } from '../types';
import { loadSave, writeSave, defaultSave } from '../hooks/useSaveSystem';

interface GameStore {
  // ── Navigation ─────────────────────────────────────────────────────────────
  screen: Screen;
  setScreen: (s: Screen) => void;

  // ── Persistent save data ───────────────────────────────────────────────────
  save: SaveData;
  setSave: (fn: (prev: SaveData) => SaveData) => void;

  // ── Coins (convenience) ────────────────────────────────────────────────────
  addCoins: (n: number) => void;
  unlockSkin: (id: string) => void;
  selectSkin: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;

  // ── Last-run result (shown on game-over screen) ────────────────────────────
  lastResult: GameOverResult | null;
  setLastResult: (r: GameOverResult) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),

  save: loadSave(),

  setSave: (fn) => {
    const next = fn(get().save);
    writeSave(next);
    set({ save: next });
  },

  addCoins: (n) => {
    get().setSave((prev) => ({
      ...prev,
      coins: prev.coins + n,
      statistics: {
        ...prev.statistics,
        coinsCollected: prev.statistics.coinsCollected + n,
      },
    }));
  },

  unlockSkin: (id) => {
    get().setSave((prev) => {
      if (prev.unlockedSkins.includes(id)) return prev;
      return { ...prev, unlockedSkins: [...prev.unlockedSkins, id] };
    });
  },

  selectSkin: (id) => {
    get().setSave((prev) => ({ ...prev, selectedSkin: id }));
  },

  updateSettings: (partial) => {
    get().setSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  },

  lastResult: null,
  setLastResult: (r) => set({ lastResult: r }),
}));

/** Called at game-over to persist stats and produce the result object. */
export function finaliseRun(
  distance: number,
  score: number,
  coins: number,
  flips: number,
  fuelPickups: number,
  airTime: number,
  sessionSecs: number,
): GameOverResult {
  const store = useGameStore.getState();
  const prev  = store.save;

  const isNewHighScore = score    > prev.highScore;
  const isNewBestDist  = distance > prev.bestDistance;

  store.addCoins(coins);

  store.setSave((p) => ({
    ...p,
    highScore:    Math.max(p.highScore,    score),
    bestDistance: Math.max(p.bestDistance, distance),
    statistics: {
      bestDistance:   Math.max(p.statistics.bestDistance,   distance),
      highestScore:   Math.max(p.statistics.highestScore,   score),
      coinsCollected: p.statistics.coinsCollected,  // already added above
      totalPlayTime:  p.statistics.totalPlayTime + sessionSecs,
      gamesPlayed:    p.statistics.gamesPlayed + 1,
      flipsPerformed: p.statistics.flipsPerformed + flips,
      fuelPickups:    p.statistics.fuelPickups + fuelPickups,
    },
  }));

  const result: GameOverResult = {
    score,
    distance,
    coins,
    flips,
    fuelPickups,
    airTime,
    highScore:       Math.max(prev.highScore,    score),
    bestDistance:    Math.max(prev.bestDistance, distance),
    isNewHighScore,
    isNewBestDist,
  };

  store.setLastResult(result);
  // Notify KinetoFun parent frame
  window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');

  return result;
}

export function getDefaultSave() { return defaultSave(); }
