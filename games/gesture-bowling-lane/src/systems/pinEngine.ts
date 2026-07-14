import { clamp } from '../utils/helpers';
import { PIN_LAYOUT, type DifficultyConfig, type RollOutcome } from '../types';

export interface RollInput {
  lanePosition: number; // -1..1, locked in at the start of the backswing
  power: number; // 0..1, captured at release
  curve: number; // signed lateral velocity captured at release
  config: DifficultyConfig;
  standingPinIds: number[]; // pins still up before this roll
}

/**
 * Deterministic release -> pin-deck resolution. The ball drifts from its
 * locked lane position toward the release-time curve, easing off at higher
 * power (a hard, straight throw has less time to hook than a soft one, the
 * same tradeoff as a real lane). A knocked-down pin is any standing pin
 * within the power-scaled hit radius of the ball's final lateral position —
 * a deliberate simplification over full row-by-row pin physics, the same
 * "approximate the read, keep the code simple" tradeoff documented for
 * other games in this catalog (see ADR-052).
 */
export function resolveRoll(input: RollInput): RollOutcome {
  const { lanePosition, power, curve, config, standingPinIds } = input;

  const curveDamping = 1.3 - power * 0.6; // softer throws hook more
  const finalLateral = clamp(lanePosition + curve * config.curveSensitivity * curveDamping, -2, 2);
  const isGutter = Math.abs(finalLateral) > config.gutterThreshold;

  if (isGutter) {
    return { finalLateral, isGutter: true, knockedPinIds: [] };
  }

  const hitRadius = config.hitRadiusBase + power * config.hitRadiusPerPower;
  const knockedPinIds = PIN_LAYOUT.filter(
    (pin) => standingPinIds.includes(pin.id) && Math.abs(pin.lateral - finalLateral) <= hitRadius,
  ).map((pin) => pin.id);

  return { finalLateral, isGutter: false, knockedPinIds };
}
