import type { DifficultyTier, FlagDef, LevelResult } from '../types';

const DIFFICULTY_POINTS: Record<DifficultyTier, number> = {
  easy: 80,
  medium: 110,
  hard: 150,
  expert: 200,
};

export const HINT_GLOW_AT_SEC = 10;
export const HINT_REGION_PULSE_AT_SEC = 20;
export const HINT_COLOR_PULSE_AT_SEC = 30;

export const COMBO_TIERS = [
  { at: 10, mult: 10 },
  { at: 5, mult: 5 },
  { at: 3, mult: 3 },
  { at: 2, mult: 2 },
] as const;

export function comboMultiplier(streak: number): number {
  for (const tier of COMBO_TIERS) if (streak >= tier.at) return tier.mult;
  return 1;
}

export function regionScore(flag: FlagDef, streak: number): number {
  const base = DIFFICULTY_POINTS[flag.difficulty];
  return Math.round(base * comboMultiplier(streak));
}

export function mistakePenalty(): number {
  return 25;
}

export interface LevelTally {
  flag: FlagDef;
  score: number;
  mistakes: number;
  bestCombo: number;
  timeSec: number;
  regionsCorrectFirstTry: number;
  totalRegions: number;
}

export function finalizeLevel(tally: LevelTally): LevelResult {
  const accuracy = tally.totalRegions === 0
    ? 1
    : Math.max(0, tally.regionsCorrectFirstTry / tally.totalRegions);

  const timeRatio = tally.timeSec / Math.max(1, tally.flag.targetTimeSec);
  let medal: LevelResult['medal'] = 'none';
  if (tally.mistakes === 0 && timeRatio <= 0.75) medal = 'perfect';
  else if (timeRatio <= 0.85) medal = 'gold';
  else if (timeRatio <= 1.1) medal = 'silver';
  else if (timeRatio <= 1.6) medal = 'bronze';

  let stars: 0 | 1 | 2 | 3 = 1;
  if (accuracy >= 0.99 && tally.mistakes === 0 && timeRatio <= 0.9) stars = 3;
  else if (accuracy >= 0.75 && tally.mistakes <= 2) stars = 2;

  const medalBonus = { none: 0, bronze: 50, silver: 120, gold: 220, perfect: 350 }[medal];
  const score = Math.max(0, tally.score + medalBonus - tally.mistakes * mistakePenalty());

  return {
    flagId: tally.flag.id,
    stars,
    score,
    accuracy,
    timeSec: tally.timeSec,
    mistakes: tally.mistakes,
    bestCombo: tally.bestCombo,
    medal,
  };
}
