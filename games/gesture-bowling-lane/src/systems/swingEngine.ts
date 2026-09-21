import type { SwingSnapshot } from '../types';

// Position thresholds the hand crosses during a bowling motion, expressed in
// normalized (0..1) frame-Y coordinates (0 = top of frame). Chosen so a
// natural "raise hand, then swing it down" motion crosses all three in
// order without needing per-frame velocity math, which is noisy without a
// live camera to tune against.
export const BACK_LINE = 0.38; // crossing above this (moving up) starts the windup
export const RELEASE_LINE = 0.68; // crossing below this during the forward swing releases the ball
export const REVERSAL_MARGIN = 0.02; // hysteresis so the backswing's own settle doesn't look like a reversal

export const MIN_SWING_MS = 150; // fastest plausible forward swing -> full power
export const MAX_SWING_MS = 900; // slowest -> near-zero power
export const ROLL_DURATION_MS = 1500;

export function initialSwing(): SwingSnapshot {
  return {
    state: 'READY',
    lanePosition: 0,
    power: 0,
    curve: 0,
    rollProgress: 0,
    ballLateral: 0,
    outcome: null,
  };
}

interface TickInput {
  snapshot: SwingSnapshot;
  lanePositionLive: number;
  crossedBackLine: boolean; // edge-triggered: hand just crossed above BACK_LINE
  crossedReversal: boolean; // edge-triggered: hand's descent just reversed the backswing
  rollElapsedMs: number;
}

/**
 * Pure state-machine transitions for every step EXCEPT the release itself
 * (FORWARD_SWING -> ROLLING), which needs to detect the release-line
 * crossing and compute pin physics as a side effect — handled directly by
 * hooks/useSwing.ts before this function runs, exactly like the archery
 * game's release interception in useShot.ts.
 * READY -> BACKSWING -> FORWARD_SWING -> (hook computes release) -> ROLLING -> RESOLVED
 */
export function tickSwing(input: TickInput): SwingSnapshot {
  const { snapshot, lanePositionLive, crossedBackLine, crossedReversal, rollElapsedMs } = input;
  const { state } = snapshot;

  switch (state) {
    case 'READY': {
      if (crossedBackLine) {
        return { ...snapshot, state: 'BACKSWING', lanePosition: lanePositionLive };
      }
      return { ...snapshot, lanePosition: lanePositionLive };
    }

    case 'BACKSWING': {
      if (crossedReversal) {
        return { ...snapshot, state: 'FORWARD_SWING', power: 0, curve: 0 };
      }
      return snapshot;
    }

    case 'FORWARD_SWING':
      // Exit handled by the hook (release-line crossing).
      return snapshot;

    case 'ROLLING': {
      const rollProgress = Math.min(1, rollElapsedMs / ROLL_DURATION_MS);
      if (rollProgress >= 1) {
        return { ...snapshot, rollProgress: 1, state: 'RESOLVED' };
      }
      return { ...snapshot, rollProgress };
    }

    case 'RESOLVED':
      return snapshot;

    default:
      return snapshot;
  }
}

export function swingPower(durationMs: number): number {
  const clamped = Math.min(MAX_SWING_MS, Math.max(MIN_SWING_MS, durationMs));
  return 1 - (clamped - MIN_SWING_MS) / (MAX_SWING_MS - MIN_SWING_MS);
}
