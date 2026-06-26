import { PINCH_THRESHOLD } from './constants';

export interface Landmark { x: number; y: number; z: number; }

export function getCursorNorm(lm: Landmark[]): { x: number; y: number } {
  if (!lm || lm.length < 9) return { x: 0.5, y: 0.5 };
  return { x: 1 - lm[8].x, y: lm[8].y };   // mirror X for natural mapping
}

export function isPinching(lm: Landmark[], threshold = PINCH_THRESHOLD): boolean {
  if (!lm || lm.length < 9) return false;
  const t = lm[4]; const i = lm[8];
  return Math.hypot(t.x - i.x, t.y - i.y) < threshold;
}

export function isFist(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  // All 4 fingertips below their MCP joints (y grows downward in normalised space)
  const curled = [
    lm[8].y  > lm[5].y,
    lm[12].y > lm[9].y,
    lm[16].y > lm[13].y,
    lm[20].y > lm[17].y,
  ];
  return curled.filter(Boolean).length >= 3;
}

export function isOpenHand(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  const extended = [
    lm[8].y  < lm[5].y,
    lm[12].y < lm[9].y,
    lm[16].y < lm[13].y,
    lm[20].y < lm[17].y,
  ];
  return extended.filter(Boolean).length >= 3;
}

// Smooth a value towards target with EMA
export function smooth(current: number, target: number, alpha = 0.25): number {
  return current + (target - current) * alpha;
}
