import type { ThrowSnapshot } from '../types';

export const DRAW_CHARGE_MS = 1100; // time to reach full power from a standing fist

// A fist opening toward an open palm almost always passes through a brief
// "neutral" hand shape (neither classified as a fist nor as fully open) for
// a frame or two. Only treat neutral as a deliberate let-down once it has
// held continuously past this grace window — otherwise every release
// attempt has a race-y chance of being cancelled before the open-palm frame
// is ever seen (see ADR-051's release bugfix, which this constant already
// fixed once in the archery-range catalog this game was scaffolded from).
export const LETDOWN_GRACE_MS = 260;

export function initialThrow(): ThrowSnapshot {
  return { state: 'AIMING', aim: { x: 0, y: 0 }, power: 0, flightProgress: 0, impact: null, outcome: null };
}

interface TickInput {
  snapshot: ThrowSnapshot;
  aim: { x: number; y: number };
  isFist: boolean;
  drawHeldMs: number;
  neutralHeldMs: number;
  flightElapsedMs: number;
  flightDurationMs: number;
}

/**
 * Pure state-machine transition function for a single throw, covering every
 * transition EXCEPT the release itself (DRAWING -> IN_FLIGHT), which needs
 * to compute physics/scatter as a side effect and is therefore handled
 * directly by the calling hook (see hooks/useThrow.ts) before this function
 * runs. The index finger only ever aims; a fist is the sole trigger to
 * start drawing back power. Relaxing the fist without opening the palm is a
 * "let-down" — the throw is abandoned with no dart spent.
 * AIMING -> DRAWING -> (hook computes release) -> IN_FLIGHT -> RESOLVED
 */
export function tickThrow(input: TickInput): ThrowSnapshot {
  const { snapshot, aim, isFist, drawHeldMs, neutralHeldMs, flightElapsedMs, flightDurationMs } = input;
  const { state } = snapshot;

  switch (state) {
    case 'AIMING': {
      if (isFist) {
        return { ...snapshot, state: 'DRAWING', aim, power: 0 };
      }
      return { ...snapshot, aim };
    }

    case 'DRAWING': {
      if (!isFist) {
        if (neutralHeldMs < LETDOWN_GRACE_MS) {
          return { ...snapshot, aim };
        }
        return { ...initialThrow(), aim };
      }
      const power = Math.min(1, drawHeldMs / DRAW_CHARGE_MS);
      return { ...snapshot, aim, power };
    }

    case 'IN_FLIGHT': {
      const flightProgress = Math.min(1, flightElapsedMs / flightDurationMs);
      if (flightProgress >= 1) {
        return { ...snapshot, flightProgress: 1, state: 'RESOLVED' };
      }
      return { ...snapshot, flightProgress };
    }

    case 'RESOLVED':
      return snapshot;

    default:
      return snapshot;
  }
}
