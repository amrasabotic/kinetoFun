import type { AiProfile, DartOutcome, GameMode } from '../types';
import { PLAYER_THROW_CONFIG } from '../types';
import { pointForTarget } from './dartboard';
import { resolveThrow } from './physics';
import { CRICKET_NUMBERS, type CricketMarks } from './cricketEngine';

function aiX01AimPoint(remaining: number): { x: number; y: number } {
  if (remaining === 50) return pointForTarget(25, 'double_bull');
  if (remaining > 0 && remaining <= 40 && remaining % 2 === 0) {
    return pointForTarget(remaining / 2, 'double');
  }
  // Not yet in checkout range — go for the highest-value scoring area.
  return pointForTarget(20, 'triple');
}

function aiCricketAimPoint(marks: CricketMarks, opponentMarks: CricketMarks): { x: number; y: number } {
  const open = [...CRICKET_NUMBERS].filter((n) => marks[n] < 3).sort((a, b) => b - a);
  if (open.length > 0) {
    const target = open[0];
    return target === 25 ? pointForTarget(25, 'bull') : pointForTarget(target, 'triple');
  }
  // Everything closed for the AI — chase points on the highest-value number the opponent hasn't also closed.
  const scoreable = [...CRICKET_NUMBERS].filter((n) => opponentMarks[n] < 3).sort((a, b) => b - a);
  const target = scoreable[0] ?? 20;
  return target === 25 ? pointForTarget(25, 'bull') : pointForTarget(target, 'triple');
}

export interface AiThrowContext {
  remaining?: number; // x01 modes
  marks?: CricketMarks; // cricket mode
  opponentMarks?: CricketMarks; // cricket mode
}

/**
 * Simulates the CPU opponent's dart: picks a sensible target (checkout
 * double in x01, highest-value open number in cricket) then throws at it
 * through the exact same `resolveThrow`/`scoreImpact` functions the
 * player's real gesture throw uses, at a fixed ideal power with scatter
 * scaled by `aiProfile.jitter` — difficulty only ever changes how shaky
 * that simulated hand is, never the rules.
 */
export function simulateAiThrow(
  mode: GameMode,
  aiProfile: AiProfile,
  jitterSeed: () => number,
  context: AiThrowContext,
): DartOutcome {
  const aim = mode === 'cricket'
    ? aiCricketAimPoint(context.marks!, context.opponentMarks!)
    : aiX01AimPoint(context.remaining!);

  return resolveThrow({
    aimX: aim.x,
    aimY: aim.y,
    power: PLAYER_THROW_CONFIG.requiredPower,
    config: { requiredPower: PLAYER_THROW_CONFIG.requiredPower, jitterBase: aiProfile.jitter, overUnderScale: 0 },
    jitterSeed,
  });
}
