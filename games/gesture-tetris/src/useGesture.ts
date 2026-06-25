import { useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { GestureInput } from './gameLogic';

// Thresholds
const TILT_THRESHOLD  = 0.08;   // horizontal offset wrist→mid-MCP to count as tilt
const RAISE_THRESHOLD = 0.30;   // wrist.y < this → raised
const LOWER_THRESHOLD = 0.72;   // wrist.y > this → lowered
const RAISE_RESET_Y   = 0.40;   // must return above this Y before raise fires again

// MediaPipe landmark indices
const WRIST    = 0;
const MID_MCP  = 9;  // middle finger knuckle

export function deriveGesture(
  hands: NormalizedLandmark[][],
  raisedFiredRef: React.MutableRefObject<boolean>,
): GestureInput {
  if (hands.length === 0) {
    return { tiltDir: 'none', isRaised: false, isLowered: false, handDetected: false };
  }

  const lm = hands[0];
  const wrist  = lm[WRIST];
  const midMcp = lm[MID_MCP];

  // Mirror x (camera is mirrored so user's right = screen right)
  const wristX  = 1 - wrist.x;
  const midMcpX = 1 - midMcp.x;
  const wristY  = wrist.y;

  // Tilt: horizontal offset of mid-MCP relative to wrist
  const dx = midMcpX - wristX;
  let tiltDir: 'left' | 'right' | 'none' = 'none';
  if (dx < -TILT_THRESHOLD)      tiltDir = 'left';
  else if (dx > TILT_THRESHOLD)  tiltDir = 'right';

  // Raise: edge-triggered — fire once, reset when wrist returns to neutral zone
  let isRaised = false;
  if (wristY < RAISE_THRESHOLD && !raisedFiredRef.current) {
    isRaised = true;
    raisedFiredRef.current = true;
  } else if (wristY > RAISE_RESET_Y) {
    raisedFiredRef.current = false;
  }

  // Lower: level-held
  const isLowered = wristY > LOWER_THRESHOLD;

  return { tiltDir, isRaised, isLowered, handDetected: true };
}

export function useGestureRefs() {
  const raisedFiredRef = useRef(false);
  return { raisedFiredRef };
}
