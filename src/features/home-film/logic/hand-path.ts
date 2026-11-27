import type { CursorState, Point } from "../types";
import { SCENE_STARTS } from "./timeline";
import { bump, clamp, ease, lerp, progress } from "./motion";

// Cues for the "tv" scene, in seconds from its start.
export const TV_CUES = {
  armUp: 0.85,
  armRaised: 1.55,
  waveEnd: 2.0,
  cursorIn: 1.5,
  travel: 1.95,
  arrive: 2.5,
  dwellDone: 3.2,
  cursorOut: 3.55,
} as const;

/** The child's shoulder and arm, in room units. */
export const ARM = {
  shoulder: { x: 826, y: 1030 },
  upper: 112,
  fore: 100,
} as const;

/** Where the hand hangs before it rises, and where it holds once raised. */
const HAND_DOWN = { x: 852, y: 1222 };
const HAND_UP = { x: 880, y: 846 };

/** Where the cursor first shows on the TV screen, and where it lands, in screen units. */
const CURSOR_START = { x: 286, y: 296 };
export const CURSOR_TARGET = { x: 571, y: 314 };

/** Room units the hand moves for one screen unit of cursor travel. */
const HAND_PER_CURSOR = 0.15;

const tvTime = (time: number) => time - SCENE_STARTS.tv;

/**
 * Two-bone reach from `shoulder` to `target`: the elbow position, with the
 * elbow bent outwards (to the right of the line from shoulder to hand).
 */
export function reach(shoulder: Point, target: Point, upper: number, fore: number) {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const distance = clamp(Math.hypot(dx, dy), Math.abs(upper - fore) + 1e-3, upper + fore - 1e-3);
  const toTarget = Math.atan2(dy, dx);
  const bend = Math.acos(clamp((upper * upper + distance * distance - fore * fore) / (2 * upper * distance), -1, 1));
  const elbow = {
    x: shoulder.x + upper * Math.cos(toTarget + bend),
    y: shoulder.y + upper * Math.sin(toTarget + bend),
  };
  const hand = {
    x: shoulder.x + distance * Math.cos(toTarget),
    y: shoulder.y + distance * Math.sin(toTarget),
  };
  return { elbow, hand };
}

/** The cursor's travel on the screen, before the small sway of a real hand is added. */
function cursorPath(t: number): Point {
  const travel = ease.glide(progress(t, TV_CUES.travel, TV_CUES.arrive));
  // A shallow arc rather than a straight line: a hand moves from the elbow.
  const control = { x: lerp(CURSOR_START.x, CURSOR_TARGET.x, 0.45), y: Math.min(CURSOR_START.y, CURSOR_TARGET.y) - 70 };
  const u = travel;
  return {
    x: (1 - u) * (1 - u) * CURSOR_START.x + 2 * (1 - u) * u * control.x + u * u * CURSOR_TARGET.x,
    y: (1 - u) * (1 - u) * CURSOR_START.y + 2 * (1 - u) * u * control.y + u * u * CURSOR_TARGET.y,
  };
}

/** The child's hello: the hand rocks at the wrist while it is up, then holds still to point. */
export function handWaveAt(time: number) {
  const t = tvTime(time);
  const envelope = bump(t, TV_CUES.armRaised - 0.25, TV_CUES.waveEnd);
  return 15 * Math.sin(2 * Math.PI * 3 * (t - TV_CUES.armRaised)) * envelope;
}

/** The cursor on the TV screen at `time`, in screen units, with how visible and how full it is. */
export function cursorAt(time: number): CursorState {
  const t = tvTime(time);
  const path = cursorPath(t);
  // The wave rocks the hand, so the cursor rocks with it.
  const sway = handWaveAt(time) * 1.4;
  // A held hand is never perfectly still.
  const tremor = progress(t, TV_CUES.arrive, TV_CUES.arrive + 0.2) * (1 - progress(t, TV_CUES.dwellDone, TV_CUES.dwellDone + 0.2));
  const point = {
    x: path.x + sway + tremor * 1.6 * Math.sin(t * 23),
    y: path.y + tremor * 1.2 * Math.sin(t * 17 + 1),
  };
  const shown = ease.enter(progress(t, TV_CUES.cursorIn, TV_CUES.cursorIn + 0.3)) * (1 - ease.leave(progress(t, TV_CUES.cursorOut, TV_CUES.cursorOut + 0.25)));
  const fill = progress(t, TV_CUES.arrive + 0.05, TV_CUES.dwellDone);
  const swell = ease.enter(progress(t, TV_CUES.dwellDone, TV_CUES.dwellDone + 0.15));
  return { point, shown, fill, swell };
}

/** The child's raised hand in room units, following the same motion the cursor shows. */
export function handAt(time: number): Point {
  const t = tvTime(time);
  const rise = ease.enter(progress(t, TV_CUES.armUp, TV_CUES.armRaised));
  // The hand swings up past the hip on a curve, not a straight line.
  const swing = Math.sin(Math.PI * rise) * 56;
  const up = {
    x: lerp(HAND_DOWN.x, HAND_UP.x, rise) + swing,
    y: lerp(HAND_DOWN.y, HAND_UP.y, rise),
  };
  const path = cursorPath(t);
  return {
    x: up.x + (path.x - CURSOR_START.x) * HAND_PER_CURSOR,
    y: up.y + (path.y - CURSOR_START.y) * HAND_PER_CURSOR,
  };
}

/**
 * How strongly the camera on the TV is tracking the hand, from 0 to 1: it
 * locks on as the arm comes up and lets go once the cursor has left.
 */
export function trackingAt(time: number) {
  const t = tvTime(time);
  const on = ease.enter(progress(t, TV_CUES.armRaised - 0.2, TV_CUES.armRaised + 0.1));
  const off = progress(t, TV_CUES.cursorOut, TV_CUES.cursorOut + 0.3);
  return on * (1 - off);
}

/** How far the burst after a select has run, from 0 to 1; 0 before the ring fills. */
export function burstAt(time: number) {
  return progress(tvTime(time), TV_CUES.dwellDone, TV_CUES.dwellDone + 0.8);
}
