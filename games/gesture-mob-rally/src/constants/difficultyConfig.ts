import type { DifficultyTier } from '../types';
import { clamp } from '../utils/mathUtils';

/**
 * Pure formula — no per-level lookup table needed, so difficulty scales
 * "for free" as levelIndex grows without any new data being authored.
 */
export function computeDifficulty(levelIndex: number): DifficultyTier {
  const speedMultiplier = clamp(1 + levelIndex * 0.035, 1, 2.2);
  const enemySizeMultiplier = clamp(1 + levelIndex * 0.07, 1, 3.2);
  const obstacleFrequency = clamp(1 + levelIndex * 0.08, 1, 3.5);
  const gateComplexityMax = clamp(1 + Math.floor(levelIndex / 3), 1, 6);
  const bossHpMultiplier = clamp(1 + Math.floor(levelIndex / 5) * 0.35, 1, 4);
  const tier = clamp(1 + Math.floor(levelIndex / 2), 1, 6);

  return {
    tier,
    speedMultiplier,
    enemySizeMultiplier,
    obstacleFrequency,
    gateComplexityMax,
    bossHpMultiplier,
  };
}
