import type { MoneyGameMode, SessionResult } from '../types';

const POINTS_PER_CORRECT = 100;
const SPEED_BONUS_MAX = 50; // awarded per round for answering quickly, no penalty for going slow

export interface RoundTally {
  correct: boolean; // solved on the first try (no wrong-bin hovers before the right one)
  timeSec: number;
}

export function finalizeSession(mode: MoneyGameMode, rounds: RoundTally[]): SessionResult {
  const correctFirstTry = rounds.filter((r) => r.correct).length;
  const mistakes = rounds.length - correctFirstTry;
  const avgTimeSec = rounds.length > 0 ? rounds.reduce((s, r) => s + r.timeSec, 0) / rounds.length : 0;

  const score = rounds.reduce((sum, r) => {
    if (!r.correct) return sum;
    const speedBonus = Math.max(0, SPEED_BONUS_MAX - Math.round(r.timeSec * 5));
    return sum + POINTS_PER_CORRECT + speedBonus;
  }, 0);

  const accuracy = rounds.length > 0 ? correctFirstTry / rounds.length : 1;
  let stars: 0 | 1 | 2 | 3 = 1;
  if (accuracy === 1) stars = 3;
  else if (accuracy >= 0.75) stars = 2;

  return { mode, rounds: rounds.length, correctFirstTry, mistakes, avgTimeSec, stars, score };
}
