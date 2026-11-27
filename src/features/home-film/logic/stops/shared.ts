import type { PlayBox, Point } from "../../types";
import { ease, lerp, progress } from "../motion";

/** The desktop play box's mascot width and height: stop sizes are drawn for it and scaled to the format's. */
const REFERENCE = { mascot: 176, height: 328 };

/** A screen height and a margin below it: things launched from here start out of sight on every format. */
export const BELOW_SCREEN = 480;

/** A point in the play box, `u` across from the left and `v` down from the top, each from 0 to 1. */
export const boxPoint = (box: PlayBox, u: number, v: number): Point => ({
  x: box.x + u * box.width,
  y: box.y + v * box.height,
});

/** How big props are drawn on this play box, relative to the desktop's. */
export const sizeScale = (box: PlayBox) => box.mascot / REFERENCE.mascot;

/** How far props travel up and down on this play box, relative to the desktop's. */
export const heightScale = (box: PlayBox) => box.height / REFERENCE.height;

/** 0 before `start`, eased up to 1 over `fadeIn`, held, then eased back to 0 by `end`. */
export const shownBetween = (time: number, start: number, end: number, fadeIn = 0.25, fadeOut = 0.25) =>
  ease.enter(progress(time, start, start + fadeIn)) * (1 - ease.leave(progress(time, end - fadeOut, end)));

/** A jump's height from 0 up to 1 and back over `seconds` from `at`. */
export const hop = (time: number, at: number, seconds: number) => Math.sin(Math.PI * progress(time, at, at + seconds));

/**
 * A hand-like move from `from` towards `to` over the span, landing on `to`
 * exactly at the end even when `to` is itself moving. `bend` bows the path
 * sideways, in screen units, the way a hand swings from the elbow.
 */
export function glide(time: number, start: number, end: number, from: Point, to: Point, bend = 0): Point {
  const a = ease.glide(progress(time, start, end));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = bend * Math.sin(Math.PI * a);
  return {
    x: lerp(from.x, to.x, a) + (dy / length) * bow,
    y: lerp(from.y, to.y, a) - (dx / length) * bow,
  };
}

/** A held hand is never perfectly still: a small drift in screen units. */
export const tremor = (time: number, amount = 1.4): Point => ({
  x: amount * Math.sin(time * 19),
  y: amount * 0.8 * Math.sin(time * 15 + 1),
});
