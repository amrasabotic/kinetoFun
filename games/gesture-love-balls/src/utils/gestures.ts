import { PINCH_THRESHOLD } from './constants';

export interface Landmark { x: number; y: number; z: number; }

export function getCursorNorm(lm: Landmark[]): { x: number; y: number } {
  if (!lm || lm.length < 9) return { x: 0.5, y: 0.5 };
  return { x: 1 - lm[8].x, y: lm[8].y };
}

/** Index finger clearly extended, other fingers curled → draw mode */
export function isPointing(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  // Index tip must be above its own MCP joint
  const indexUp = lm[8].y < lm[5].y;
  // AND index tip must be visibly higher than middle and ring fingertips
  // (relative comparison — robust across hand sizes & distances)
  const indexAboveMiddle = lm[8].y < lm[12].y - 0.04;
  const indexAboveRing   = lm[8].y < lm[16].y - 0.04;
  // At least 2 of the other 3 fingers must be curled below their MCPs
  const curledCount = [
    lm[12].y > lm[9].y,
    lm[16].y > lm[13].y,
    lm[20].y > lm[17].y,
  ].filter(Boolean).length;
  return indexUp && indexAboveMiddle && indexAboveRing && curledCount >= 2;
}

/** Thumb pointing up, all 4 fingers curled → launch */
export function isThumbsUp(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
  const thumbUp = lm[4].y < lm[2].y - 0.04;   // thumb tip well above thumb base
  const curled = [
    lm[8].y  >= lm[6].y,   // index curled
    lm[12].y >= lm[10].y,  // middle curled
    lm[16].y >= lm[14].y,  // ring curled
    lm[20].y >= lm[18].y,  // pinky curled
  ].filter(Boolean).length >= 3;
  return thumbUp && curled;
}

/** Return palm centre in normalised coords (X already mirror-flipped) */
export function getPalmCenter(lm: Landmark[]): { x: number; y: number } {
  if (!lm || lm.length < 18) return { x: 0.5, y: 0.5 };
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: 1 - x, y };   // mirror X
}

export function isPinching(lm: Landmark[], threshold = PINCH_THRESHOLD): boolean {
  if (!lm || lm.length < 9) return false;
  const t = lm[4]; const i = lm[8];
  return Math.hypot(t.x - i.x, t.y - i.y) < threshold;
}

export function isFist(lm: Landmark[]): boolean {
  if (!lm || lm.length < 21) return false;
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

export function smooth(current: number, target: number, alpha = 0.25): number {
  return current + (target - current) * alpha;
}
