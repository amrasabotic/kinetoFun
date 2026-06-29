import { PINCH_THRESHOLD, STEADY_STD_MAX } from './constants';

export interface Landmark { x: number; y: number; z: number; }

/** Index fingertip in normalised coords, X already mirror-flipped. */
export function getCursorNorm(lm: Landmark[]): { x: number; y: number } {
  if (!lm || lm.length < 9) return { x: 0.5, y: 0.5 };
  return { x: 1 - lm[8].x, y: lm[8].y };
}

/** Thumb tip touching index tip → fire. */
export function isPinching(lm: Landmark[], threshold = PINCH_THRESHOLD): boolean {
  if (!lm || lm.length < 9) return false;
  const t = lm[4];
  const i = lm[8];
  return Math.hypot(t.x - i.x, t.y - i.y) < threshold;
}

/** All four fingers extended → open palm (zoom cycle). */
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

/** Most fingers curled → fist (reset / quick-restart). */
export function isFist(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  const curled = [
    lm[8].y > lm[5].y,
    lm[12].y > lm[9].y,
    lm[16].y > lm[13].y,
    lm[20].y > lm[17].y,
  ];
  return curled.filter(Boolean).length >= 4;
}

export function smooth(current: number, target: number, alpha = 0.25): number {
  return current + (target - current) * alpha;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Rolling steadiness detector. Feed it the normalised cursor each frame; it
 * reports whether the hand has been still long enough to engage STEADY AIM.
 */
export class SteadyTracker {
  private xs: number[] = [];
  private ys: number[] = [];
  private readonly size = 18;
  steady = false;

  push(x: number, y: number): boolean {
    this.xs.push(x);
    this.ys.push(y);
    if (this.xs.length > this.size) { this.xs.shift(); this.ys.shift(); }
    if (this.xs.length < this.size) { this.steady = false; return false; }
    this.steady = std(this.xs) < STEADY_STD_MAX && std(this.ys) < STEADY_STD_MAX;
    return this.steady;
  }

  reset() { this.xs = []; this.ys = []; this.steady = false; }
}

function std(arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length;
  return Math.sqrt(variance);
}
