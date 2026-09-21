import { clamp } from '../utils/helpers';
import { SCORE_RINGS, type RoundConfig, type ShotResult } from '../types';

/**
 * Power required (0..1) to reach a given distance. Below ~80% of this the
 * arrow falls short of the target plane entirely — power must be judged,
 * not just aim, exactly like drawing a real bow harder for a farther shot.
 */
export function requiredPower(distance: number): number {
  return clamp(0.35 + distance / 70, 0.35, 0.95);
}

export interface ShotInput {
  aimX: number; // -1..1, 0 = dead center of target
  aimY: number; // -1..1, 0 = dead center of target
  power: number; // 0..1 charge at release
  config: RoundConfig;
  windSeed: () => number; // 0..1 RNG, consumed once per shot
}

export interface ShotOutcome {
  impactX: number; // -1..1 relative to target center (may exceed 1 = clean miss)
  impactY: number;
  result: ShotResult;
  points: number;
  windDrift: number; // -1..1, applied lateral drift, surfaced for the wind indicator/feedback
}

/**
 * Deterministic aim+power -> impact resolution. The reticle position is
 * where the arrow would land with exactly the right power and no wind;
 * under/over-drawing pushes the impact vertically (short draws drop low,
 * over-draws sail high), and wind pushes it laterally, scaled by distance.
 */
export function resolveShot(input: ShotInput): ShotOutcome {
  const { aimX, aimY, power, config } = input;
  const needed = requiredPower(config.distance);

  if (power < needed * 0.75) {
    return { impactX: aimX, impactY: 1.6, result: 'short', points: 0, windDrift: 0 };
  }

  const powerError = power - needed; // negative = underdrawn, positive = overdrawn
  const verticalError = -powerError * 2.2; // underdraw -> drops down (+Y), overdraw -> sails up (-Y)

  const windDrift = (input.windSeed() * 2 - 1) * config.windStrength;

  const impactX = aimX + windDrift;
  const impactY = aimY + verticalError;

  const radial = Math.hypot(impactX, impactY);
  const ring = SCORE_RINGS.find((r) => radial <= r.radiusFraction);
  const result: ShotResult = ring ? ring.result : 'miss';
  const points = ring ? ring.points : 0;

  return { impactX, impactY, result, points, windDrift };
}

export const RESULT_LABEL: Record<ShotResult, string> = {
  bullseye: 'Bullseye!',
  inner: 'Inner Ring',
  mid: 'Nice Shot',
  outer: 'On the Board',
  short: 'Fell Short',
  miss: 'Miss',
};
