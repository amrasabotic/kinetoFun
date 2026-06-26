import { useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BasketGestureInput } from './gameLogic';

// Shoot is triggered by raising the wrist above this Y threshold (smaller = higher in frame)
const SHOOT_THRESHOLD  = 0.28;
// Wrist must descend back past this Y before the next shoot fires
const SHOOT_RESET_Y    = 0.44;

const WRIST = 0;

export function deriveBasketGesture(
  hands:         NormalizedLandmark[][],
  shootFiredRef: React.MutableRefObject<boolean>,
): BasketGestureInput {
  if (hands.length === 0) {
    return { aimX: 0.5, handDetected: false, shootFired: false };
  }

  // Mirror X so camera is natural (self-view)
  const wrist = hands[0][WRIST];
  const aimX  = 1 - wrist.x;
  const wristY = wrist.y;

  // Edge-triggered shoot: fires once on each raise, resets when hand lowers
  let shootFired = false;
  if (wristY < SHOOT_THRESHOLD && !shootFiredRef.current) {
    shootFired            = true;
    shootFiredRef.current = true;
  } else if (wristY > SHOOT_RESET_Y) {
    shootFiredRef.current = false;
  }

  return { aimX, handDetected: true, shootFired };
}

export function useGestureRefs() {
  const shootFiredRef = useRef(false);
  return { shootFiredRef };
}
