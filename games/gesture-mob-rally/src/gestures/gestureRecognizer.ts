import type { HandData } from './useMediaPipe';
import { WRIST_X_SMOOTH_FACTOR, CHARGE_FIST_HOLD_MS, PAUSE_PALM_HOLD_MS, TRACK_HALF_WIDTH } from '../constants/gameConfig';

export interface GestureOutput {
  laneX: number;
  detected: boolean;
  chargeTriggered: boolean;
  pauseToggled: boolean;
  fistHeldMs: number;
  palmHeldMs: number;
}

let smoothWristX = 0.5;
let fistHoldStart: number | null = null;
let palmHoldStart: number | null = null;
let fistConsumed = false;
let palmConsumed = false;

/**
 * Turns raw hand landmarks into game intents:
 *  - laneX: wrist-X mapped + EMA-smoothed to a world lane offset (never snaps)
 *  - chargeTriggered: fires once when a fist has been held >= CHARGE_FIST_HOLD_MS
 *  - pauseToggled: fires once when an open palm has been held >= PAUSE_PALM_HOLD_MS
 */
export function processGesture(hand: HandData, sensitivity: number): GestureOutput {
  if (!hand.detected) {
    fistHoldStart = null; palmHoldStart = null; fistConsumed = false; palmConsumed = false;
    return {
      laneX: (smoothWristX - 0.5) * 2 * TRACK_HALF_WIDTH,
      detected: false, chargeTriggered: false, pauseToggled: false, fistHeldMs: 0, palmHeldMs: 0,
    };
  }

  // Mirror X because the camera preview is mirrored
  const rawX = 1 - hand.wristX;
  smoothWristX += (rawX - smoothWristX) * WRIST_X_SMOOTH_FACTOR * Math.max(0.2, sensitivity);

  const now = performance.now();

  let chargeTriggered = false;
  if (hand.isFist) {
    if (fistHoldStart === null) fistHoldStart = now;
    if (now - fistHoldStart >= CHARGE_FIST_HOLD_MS && !fistConsumed) {
      chargeTriggered = true;
      fistConsumed = true;
    }
  } else {
    fistHoldStart = null;
    fistConsumed = false;
  }

  let pauseToggled = false;
  if (hand.isOpen) {
    if (palmHoldStart === null) palmHoldStart = now;
    if (now - palmHoldStart >= PAUSE_PALM_HOLD_MS && !palmConsumed) {
      pauseToggled = true;
      palmConsumed = true;
    }
  } else {
    palmHoldStart = null;
    palmConsumed = false;
  }

  return {
    laneX: (smoothWristX - 0.5) * 2 * TRACK_HALF_WIDTH,
    detected: true,
    chargeTriggered,
    pauseToggled,
    fistHeldMs: fistHoldStart ? now - fistHoldStart : 0,
    palmHeldMs: palmHoldStart ? now - palmHoldStart : 0,
  };
}

export function resetGestureSmoothing(): void {
  smoothWristX = 0.5;
  fistHoldStart = null;
  palmHoldStart = null;
  fistConsumed = false;
  palmConsumed = false;
}
