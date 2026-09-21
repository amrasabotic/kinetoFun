import { PINCH_THRESHOLD } from './constants';

export interface Landmark { x: number; y: number; z: number; }

/** Thumb tip touching index tip → quick throw / pinch. */
export function isPinching(lm: Landmark[], threshold = PINCH_THRESHOLD): boolean {
  if (!lm || lm.length < 9) return false;
  const t = lm[4];
  const i = lm[8];
  return Math.hypot(t.x - i.x, t.y - i.y) < threshold;
}

/** All four fingers curled toward the palm → closed fist (charge). */
export function isFist(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  const curled = [
    lm[8].y > lm[6].y,   // index tip below its PIP
    lm[12].y > lm[10].y, // middle
    lm[16].y > lm[14].y, // ring
    lm[20].y > lm[18].y, // pinky
  ];
  return curled.filter(Boolean).length >= 3;
}

/** All four fingers extended → open palm. */
export function isOpenHand(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  const extended = [
    lm[8].y < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
  return extended.filter(Boolean).length >= 4;
}

export function smooth(current: number, target: number, alpha = 0.28): number {
  return current + (target - current) * alpha;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const DEG = Math.PI / 180;
