import { useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { VolleyGestureInput } from './gameLogic';

// Thresholds
const SMASH_THRESHOLD  = 0.28;  // wrist Y < this → smash charged
const SMASH_RESET_Y    = 0.42;  // must return above this before smash fires again
const BLOCK_SPREAD     = 0.35;  // mirrored X gap between two wrists → block

const WRIST = 0;

export function deriveVolleyballGesture(
  hands:          NormalizedLandmark[][],
  _handednesses:  string[],
  smashFiredRef:  React.MutableRefObject<boolean>,
): VolleyGestureInput {
  if (hands.length === 0) {
    return { playerX: 0.5, isSmashing: false, isBlocking: false, highestHandY: 1, handsSpread: 0, handDetected: false };
  }

  // Mirror all wrist positions (camera is flipped; x=1-raw keeps screen natural)
  const wrists = hands.map(lm => ({ x: 1 - lm[WRIST].x, y: lm[WRIST].y }));

  // Position: average of all detected wrists
  const avgX = wrists.reduce((s, w) => s + w.x, 0) / wrists.length;

  // Highest hand (smallest Y = physically highest in frame)
  const highestY = Math.min(...wrists.map(w => w.y));

  // Smash: edge-triggered – fires once per raise; resets when hand lowers
  let isSmashing = false;
  if (highestY < SMASH_THRESHOLD && !smashFiredRef.current) {
    isSmashing            = true;
    smashFiredRef.current = true;
  } else if (highestY > SMASH_RESET_Y) {
    smashFiredRef.current = false;
  }

  // Block: two hands visible and spread wide horizontally
  let isBlocking  = false;
  let handsSpread = 0;
  if (wrists.length >= 2) {
    const xs     = wrists.map(w => w.x);
    const spread = Math.max(...xs) - Math.min(...xs);
    handsSpread  = Math.min(spread / 0.5, 1);
    if (spread > BLOCK_SPREAD) isBlocking = true;
  }

  return { playerX: avgX, isSmashing, isBlocking, highestHandY: highestY, handsSpread, handDetected: true };
}

export function useGestureRefs() {
  const smashFiredRef = useRef(false);
  return { smashFiredRef };
}
