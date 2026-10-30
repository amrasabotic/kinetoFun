import { useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BasketGestureInput } from './gameLogic';

// Fist winds up, opening the hand shoots. A pose needs no big arm movement, which the camera
// often misses from a sofa; the power sweeps up and down while the fist is held, so timing the release is the skill.

const SWEEP_MS  = 1400;  // power climbs 0 to 1 in this time, then falls back
const MIN_HOLD  = 250;   // a fist shorter than this is a flicker, not a wind-up
const POSE_MS   = 90;    // a pose must hold this long before it counts

const TIPS: [number, number][] = [[8, 5], [12, 9], [16, 13], [20, 17]];
const dist = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

function pose(lm: NormalizedLandmark[]): 'fist' | 'open' | null {
  const w = lm[0];
  const curled = TIPS.filter(([t, k]) => dist(lm[t], w) < dist(lm[k], w) * 1.15).length;
  const straight = TIPS.filter(([t, k]) => dist(lm[t], w) > dist(lm[k], w) * 1.45).length;
  if (curled >= 3) return 'fist';
  if (straight >= 3) return 'open';
  return null;
}

// The middle of the camera view covers the full aim range, so the edges never need reaching.
const reach = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

export interface GestureRefs {
  poseRef:      React.MutableRefObject<{ raw: 'fist' | 'open' | null; since: number; held: 'fist' | 'open' | null }>;
  chargeFromRef: React.MutableRefObject<number | null>;
}

export function useGestureRefs(): GestureRefs {
  return {
    poseRef:       useRef({ raw: null, since: 0, held: null }),
    chargeFromRef: useRef<number | null>(null),
  };
}

export function sweepPower(heldMs: number): number {
  const phase = (heldMs / SWEEP_MS) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

export function deriveBasketGesture(
  hands: NormalizedLandmark[][],
  refs:  GestureRefs,
  now:   number = performance.now(),
): BasketGestureInput {
  const { poseRef, chargeFromRef } = refs;
  if (hands.length === 0) {
    chargeFromRef.current = null;
    return { aimX: 0.5, handDetected: false, shootFired: false, throwPower: 0, charging: false, chargeRatio: 0 };
  }

  const lm   = hands[0];
  const aimX = reach(1 - lm[0].x, 0.15, 0.85);

  const raw = pose(lm);
  const p = poseRef.current;
  if (raw !== p.raw) { p.raw = raw; p.since = now; }
  if (raw && now - p.since >= POSE_MS) p.held = raw;

  if (p.held === 'fist') {
    chargeFromRef.current ??= now;
    const power = sweepPower(now - chargeFromRef.current);
    return { aimX, handDetected: true, shootFired: false, throwPower: 0, charging: true, chargeRatio: power };
  }

  const from = chargeFromRef.current;
  chargeFromRef.current = null;
  if (p.held === 'open' && from !== null && now - from >= MIN_HOLD) {
    const power = sweepPower(now - from);
    return { aimX, handDetected: true, shootFired: true, throwPower: power, charging: false, chargeRatio: power };
  }
  return { aimX, handDetected: true, shootFired: false, throwPower: 0, charging: false, chargeRatio: 0 };
}
