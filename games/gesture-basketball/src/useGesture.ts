import { useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BasketGestureInput } from './gameLogic';

// ── Rise-detection throw ───────────────────────────────────────────────────────
// Player holds hand below READY_Y (lower half of frame), then raises it.
// When wrist rises THROW_THRESHOLD above the resting baseline, a shot fires.
// Power = how much it rose / MAX_RISE.
// After a shot the hand must return to READY_Y before the next shot is available.

const READY_Y         = 0.54;   // wrist must be below this (lower half) to ready up
const THROW_THRESHOLD = 0.14;   // rise above baseline needed to fire (14% of frame)
const MAX_RISE        = 0.32;   // rise = full power (1.0)

const WRIST = 0;

export interface GestureRefs {
  shootFiredRef: React.MutableRefObject<boolean>;
  peakYRef:      React.MutableRefObject<number>;
  baseYRef:      React.MutableRefObject<number>;
}

export function useGestureRefs(): GestureRefs {
  return {
    shootFiredRef: useRef(false),
    peakYRef:      useRef(0.7),
    baseYRef:      useRef(0.7),
  };
}

export function deriveBasketGesture(
  hands:   NormalizedLandmark[][],
  refs:    GestureRefs,
): BasketGestureInput {
  if (hands.length === 0) {
    return { aimX: 0.5, handDetected: false, shootFired: false, throwPower: 0, wristY: 0.7, chargeRatio: 0 };
  }

  const wrist  = hands[0][WRIST];
  const aimX   = 1 - wrist.x;
  const wristY = wrist.y;

  const { shootFiredRef, peakYRef, baseYRef } = refs;

  if (shootFiredRef.current) {
    // Waiting for hand to return to resting position before next shot
    if (wristY > READY_Y) {
      shootFiredRef.current  = false;
      peakYRef.current       = wristY;
      baseYRef.current       = wristY;
    }
    return { aimX, handDetected: true, shootFired: false, throwPower: 0, wristY, chargeRatio: 0 };
  }

  // Continuously track resting baseline (only while hand is in ready zone)
  if (wristY > READY_Y) {
    baseYRef.current = wristY;
    peakYRef.current = wristY;
  }

  // Track peak (highest point reached above baseline)
  if (wristY < peakYRef.current) {
    peakYRef.current = wristY;
  }

  const rise = baseYRef.current - peakYRef.current;

  if (rise > THROW_THRESHOLD) {
    const throwPower      = Math.min(rise / MAX_RISE, 1.0);
    shootFiredRef.current = true;
    return { aimX, handDetected: true, shootFired: true, throwPower, wristY, chargeRatio: 1 };
  }

  const chargeRatio = Math.min(rise / THROW_THRESHOLD, 1);
  return { aimX, handDetected: true, shootFired: false, throwPower: 0, wristY, chargeRatio };
}
