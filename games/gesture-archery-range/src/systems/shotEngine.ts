import type { ShotSnapshot } from '../types';

export const DRAW_CHARGE_MS = 1400; // time to reach full power from a standing fist

// A fist opening toward an open palm almost always passes through a brief
// "neutral" hand shape (neither classified as a fist nor as fully open) for
// a frame or two. Only treat neutral as a deliberate let-down once it has
// held continuously past this grace window — otherwise every release
// attempt has a race-y chance of being cancelled before the open-palm frame
// is ever seen.
export const LETDOWN_GRACE_MS = 260;

export function initialShot(): ShotSnapshot {
  return { state: 'AIMING', aim: { x: 0, y: 0 }, power: 0, flightProgress: 0, impact: null, result: null };
}

interface TickInput {
  snapshot: ShotSnapshot;
  aim: { x: number; y: number }; // normalized reticle position, always tracked live
  isFist: boolean;
  drawHeldMs: number; // continuous ms the fist has been held this draw
  neutralHeldMs: number; // continuous ms the hand has been neither a fist nor an open palm
  flightElapsedMs: number; // ms since entering IN_FLIGHT
  flightDurationMs: number;
}

/**
 * Pure state-machine transition function for a single shot, covering every
 * transition EXCEPT the release itself (DRAWING -> IN_FLIGHT), which needs
 * to compute physics/wind as a side effect and is therefore handled directly
 * by the calling hook (see hooks/useShot.ts) before this function runs.
 * The index finger only ever aims; a fist is the sole trigger to start
 * drawing power. Relaxing the fist without opening the palm is a
 * "let-down" — the draw is abandoned with no arrow spent, matching how a
 * real bow is lowered without firing.
 * AIMING -> DRAWING -> (hook computes release) -> IN_FLIGHT -> RESOLVED
 */
export function tickShot(input: TickInput): ShotSnapshot {
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
          // Likely mid-transition toward an open-palm release — hold the
          // current power steady and wait rather than cancelling early.
          return { ...snapshot, aim };
        }
        // Sustained neutral hand: a genuine let-down, bow lowered, no arrow spent.
        return { ...initialShot(), aim };
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
