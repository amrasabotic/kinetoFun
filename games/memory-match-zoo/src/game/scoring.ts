import type { BoardSize, SessionResult } from '../types';

const POINTS_PER_PAIR = 50;
const FLIP_EFFICIENCY_THRESHOLD = 1.5; // par = pairs × 2; threshold = par × 1.5

export function finalizeSession(size: BoardSize, pairs: number, flips: number, mismatches: number): SessionResult {
  const par = pairs * 2;
  const efficiency = flips / par;

  let stars: 0 | 1 | 2 | 3 = 1;
  if (efficiency <= 1) stars = 3; // perfect or near-perfect
  else if (efficiency <= FLIP_EFFICIENCY_THRESHOLD) stars = 2;

  const score = Math.max(POINTS_PER_PAIR * pairs - Math.round(mismatches * 10), POINTS_PER_PAIR);

  return { size, pairs, flips, mismatches, stars, score };
}
