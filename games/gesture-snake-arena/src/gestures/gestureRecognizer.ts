import type { HandData } from './useMediaPipe';

export interface GestureOutput {
  // Direction vector (normalized)
  dirX: number;
  dirY: number;
  // Magnitude 0-1 for analog speed
  magnitude: number;
  // Boost active
  boosting: boolean;
  detected: boolean;
}

// Smoothing
const SMOOTH_FACTOR = 0.25;
let smoothX = 0.5;
let smoothY = 0.5;

export function processGesture(hand: HandData, sensitivity: number): GestureOutput {
  if (!hand.detected) {
    return { dirX: 0, dirY: 0, magnitude: 0, boosting: false, detected: false };
  }

  // Mirror X because camera is mirrored
  const rawX = 1 - hand.palmX;
  const rawY = hand.palmY;

  // Smooth the position
  smoothX += (rawX - smoothX) * SMOOTH_FACTOR;
  smoothY += (rawY - smoothY) * SMOOTH_FACTOR;

  // Direction from center of frame (0.5, 0.5)
  const cx = smoothX - 0.5;
  const cy = smoothY - 0.5;

  // Magnitude (clamped 0-1) — controls speed
  const mag = Math.min(Math.sqrt(cx * cx + cy * cy) * 2.5 * sensitivity, 1);

  // Dead zone
  if (mag < 0.05) {
    return { dirX: 0, dirY: 0, magnitude: 0, boosting: hand.isFist, detected: true };
  }

  const len = Math.sqrt(cx * cx + cy * cy);
  return {
    dirX: cx / len,
    dirY: cy / len,
    magnitude: mag,
    boosting: hand.isFist,
    detected: true,
  };
}

export function resetSmoothing() {
  smoothX = 0.5;
  smoothY = 0.5;
}
