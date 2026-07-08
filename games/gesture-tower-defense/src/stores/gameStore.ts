import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DailyResult {
  wavesCleared: number;
  won: boolean;
}

interface Stats {
  matchesPlayed: number;
  matchesWon: number;
  enemiesDefeated: number;
  wavesCleared: number;
  towersPlaced: number;
}

interface GameState {
  campaignStars: Record<number, 1 | 2 | 3>;
  campaignHighestUnlocked: number;
  endlessHighestWave: number;
  dailyCompletions: Record<string, DailyResult>;
  stats: Stats;
  /** Monotonically increasing — submitted to the platform as this game's score. */
  lifetimeScore: number;

  recordTowerPlaced: () => void;
  recordEnemyDefeated: (reward: number) => void;
  recordWaveCleared: () => void;
  recordCampaignResult: (level: number, won: boolean, stars: 1 | 2 | 3) => void;
  recordEndlessResult: (highestWaveReached: number) => void;
  recordDailyResult: (dateIso: string, result: DailyResult) => void;
  resetProgress: () => void;
}

const DEFAULT_STATS: Stats = { matchesPlayed: 0, matchesWon: 0, enemiesDefeated: 0, wavesCleared: 0, towersPlaced: 0 };

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      campaignStars: {},
      campaignHighestUnlocked: 1,
      endlessHighestWave: 0,
      dailyCompletions: {},
      stats: DEFAULT_STATS,
      lifetimeScore: 0,

      recordTowerPlaced: () =>
        set((s) => ({ stats: { ...s.stats, towersPlaced: s.stats.towersPlaced + 1 } })),

      recordEnemyDefeated: (reward) =>
        set((s) => ({
          stats: { ...s.stats, enemiesDefeated: s.stats.enemiesDefeated + 1 },
          lifetimeScore: s.lifetimeScore + reward,
        })),

      recordWaveCleared: () =>
        set((s) => ({ stats: { ...s.stats, wavesCleared: s.stats.wavesCleared + 1 }, lifetimeScore: s.lifetimeScore + 20 })),

      recordCampaignResult: (level, won, stars) =>
        set((s) => {
          const best = s.campaignStars[level];
          const campaignStars = won && (best === undefined || stars > best) ? { ...s.campaignStars, [level]: stars } : s.campaignStars;
          const campaignHighestUnlocked = won ? Math.max(s.campaignHighestUnlocked, level + 1) : s.campaignHighestUnlocked;
          return {
            campaignStars,
            campaignHighestUnlocked,
            stats: { ...s.stats, matchesPlayed: s.stats.matchesPlayed + 1, matchesWon: s.stats.matchesWon + (won ? 1 : 0) },
            lifetimeScore: s.lifetimeScore + (won ? 100 : 0),
          };
        }),

      recordEndlessResult: (highestWaveReached) =>
        set((s) => ({
          endlessHighestWave: Math.max(s.endlessHighestWave, highestWaveReached),
          stats: { ...s.stats, matchesPlayed: s.stats.matchesPlayed + 1 },
        })),

      recordDailyResult: (dateIso, result) =>
        set((s) => ({
          dailyCompletions: { ...s.dailyCompletions, [dateIso]: result },
          stats: { ...s.stats, matchesPlayed: s.stats.matchesPlayed + 1, matchesWon: s.stats.matchesWon + (result.won ? 1 : 0) },
          lifetimeScore: s.lifetimeScore + (result.won ? 100 : 0),
        })),

      resetProgress: () =>
        set({
          campaignStars: {},
          campaignHighestUnlocked: 1,
          endlessHighestWave: 0,
          dailyCompletions: {},
          stats: DEFAULT_STATS,
          lifetimeScore: 0,
        }),
    }),
    { name: 'gesture-tower-defense-save' },
  ),
);

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hasDailyCompletedToday(dailyCompletions: Record<string, DailyResult>): boolean {
  return todayIso() in dailyCompletions;
}
