import type { SwingSnapshot } from '../types';

export const CHARGE_MS = 1200; // time to reach full putt power from a standing fist

export function initialSwing(ballX: number, ballY: number): SwingSnapshot {
  return {
    state: 'READY',
    aimTarget: { x: ballX, y: ballY },
    power: 0,
    ballPosition: { x: ballX, y: ballY },
    outcome: null,
  };
}

interface TickInput {
  snapshot: SwingSnapshot;
  aimTargetLive: { x: number; y: number };
  isFist: boolean;
  chargeHeldMs: number; // continuous ms the fist has been held this charge
}

/**
 * Pure state-machine transitions for READY -> CHARGING. The index finger
 * only ever aims; a held fist is the sole trigger to charge putt power, and
 * releasing the fist (opening the hand back up) is the sole trigger to
 * shoot — handled directly by hooks/useSwing.ts, which needs to detect the
 * fist-release edge and compute the release velocity/physics as a side
 * effect, exactly like the archery game's release interception. ROLLING
 * and RESOLVED are likewise owned entirely by the hook, since a putt's
 * duration depends on real per-tick physics (walls/slopes/water), not a
 * fixed animation.
 * READY -> CHARGING -> (hook computes release + physics) -> ROLLING -> RESOLVED
 */
export function tickSwing(input: TickInput): SwingSnapshot {
  const { snapshot, aimTargetLive, isFist, chargeHeldMs } = input;
  const { state } = snapshot;

  switch (state) {
    case 'READY': {
      if (isFist) {
        return { ...snapshot, state: 'CHARGING', aimTarget: aimTargetLive, power: 0 };
      }
      return { ...snapshot, aimTarget: aimTargetLive };
    }

    case 'CHARGING': {
      // Exit (fist released) handled by the hook. Aim keeps tracking the
      // hand live so the player can fine-tune it while charging.
      const power = Math.min(1, chargeHeldMs / CHARGE_MS);
      return { ...snapshot, aimTarget: aimTargetLive, power };
    }

    default:
      return snapshot;
  }
}
