import type { DartOutcome, ThrowConfig } from '../types';
import { scoreImpact } from './dartboard';

/** Fixed throw strength needed for a clean shot — darts is thrown from one fixed oche distance, unlike archery's per-difficulty distance. */
export const REQUIRED_POWER = 0.55;

export interface ThrowInput {
  aimX: number; // -1..1, 0 = dead center of the board
  aimY: number; // -1..1, 0 = dead center of the board
  power: number; // 0..1 charge at release
  config: ThrowConfig;
  jitterSeed: () => number; // 0..1 RNG, consumed twice per throw (x/y scatter)
}

/**
 * Deterministic aim+power -> impact resolution, in the same spirit as the
 * archery/mini-golf engines this catalog already uses: the reticle is where
 * the dart lands on a perfectly judged throw. Under-throwing below 60% of
 * the required power drops the dart short of the board entirely (a clean
 * miss); above that, how far off `REQUIRED_POWER` the throw was scales a
 * random scatter around the reticle (`overUnderScale`), on top of a small
 * baseline scatter that always applies (`jitterBase`, standing in for
 * ordinary hand shake even on a well-judged throw).
 */
export function resolveThrow(input: ThrowInput): DartOutcome {
  const { aimX, aimY, power, config } = input;

  if (power < config.requiredPower * 0.6) {
    return { sector: 0, ring: 'miss', multiplier: 0, points: 0, x: aimX, y: 1.4 };
  }

  const powerError = power - config.requiredPower;
  const scatter = config.jitterBase + Math.abs(powerError) * config.overUnderScale;
  const jitterX = (input.jitterSeed() * 2 - 1) * scatter;
  const jitterY = (input.jitterSeed() * 2 - 1) * scatter;

  return scoreImpact(aimX + jitterX, aimY + jitterY);
}
