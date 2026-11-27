import type { CursorState, MascotPose, PlayBox, Point } from "../../types";
import { progress, wobble } from "../motion";
import { BELOW_SCREEN, boxPoint, glide, hop, shownBetween, sizeScale } from "./shared";

/** Screen units per second squared that thrown fruit falls back with. */
const GRAVITY = 980;

/** Fruit kinds, drawn by the screen: a melon, an orange and an apple. */
export type FruitKind = "melon" | "orange" | "apple";

/**
 * Each fruit is thrown up from below the screen. It is described by the top
 * of its arc (where across and down the play box, and when) and its sideways
 * drift; the swipe that cuts it is given by index.
 */
type FruitPlan = {
  kind: FruitKind;
  peak: { u: number; v: number; at: number };
  drift: number;
  spin: number;
  radius: number;
  swipe: number;
};

const FRUITS: readonly FruitPlan[] = [
  { kind: "melon", peak: { u: 0.2, v: 0.2, at: 1.03 }, drift: 34, spin: 150, radius: 31, swipe: 0 },
  { kind: "orange", peak: { u: 0.45, v: 0.3, at: 1.0 }, drift: -26, spin: -210, radius: 24, swipe: 0 },
  { kind: "apple", peak: { u: 0.34, v: 0.22, at: 1.45 }, drift: 22, spin: 230, radius: 25, swipe: 1 },
];

/** Two swipes: a forehand slash down to the right, then a backhand down to the left. */
const SWIPES = [
  { from: { u: 0.0, v: 0.1 }, to: { u: 0.66, v: 0.5 }, start: 0.96, end: 1.16 },
  { from: { u: 0.62, v: 0.06 }, to: { u: 0.02, v: 0.44 }, start: 1.48, end: 1.66 },
] as const;

const CURSOR = { in: 0.72, out: 2.05, enter: { u: 0.16, v: 0.62 } };
/** The blade's trail looks back this many seconds, in this many samples. */
const TRAIL = { seconds: 0.11, samples: 9 };
const HALF_SPEED = 95;
const JUICE = 6;

/** A fruit in flight: centre, radius and spin in degrees. */
export type WholeFruit = { kind: FruitKind; x: number; y: number; r: number; angle: number };
/**
 * Half a cut fruit: the centre of its cut face, and the angle of the cut,
 * the half lying below it at 0. It fades as it falls past the ground, so it
 * never crosses the words below the play box.
 */
export type FruitHalf = { kind: FruitKind; x: number; y: number; r: number; angle: number; opacity: number };
export type Drop = { x: number; y: number; r: number; opacity: number; kind: FruitKind };

export type SliceState = {
  whole: WholeFruit[];
  halves: FruitHalf[];
  juice: Drop[];
  /** The blade trail from its tail to its head, in screen units; empty when no swipe is running. */
  trail: Point[];
  cursor: CursorState;
  look: Point;
};

function fruitAt(index: number, time: number, box: PlayBox) {
  const fruit = FRUITS[index];
  const peak = boxPoint(box, fruit.peak.u, fruit.peak.v);
  const since = time - fruit.peak.at;
  return {
    x: peak.x + fruit.drift * since,
    y: peak.y + 0.5 * GRAVITY * since * since,
    vx: fruit.drift,
    vy: GRAVITY * since,
  };
}

/** When a fruit leaves the bottom of the screen on its way up. */
function launchTime(index: number, box: PlayBox) {
  const peak = boxPoint(box, FRUITS[index].peak.u, FRUITS[index].peak.v);
  return FRUITS[index].peak.at - Math.sqrt((2 * (BELOW_SCREEN - peak.y)) / GRAVITY);
}

function bladeAt(index: number, time: number, box: PlayBox): Point {
  const swipe = SWIPES[index];
  const p = progress(time, swipe.start, swipe.end);
  const from = boxPoint(box, swipe.from.u, swipe.from.v);
  const to = boxPoint(box, swipe.to.u, swipe.to.v);
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
}

/**
 * When a fruit is cut: the moment its swipe's blade passes closest to it,
 * found by sampling the swipe. Also returns the blade's direction there.
 */
export function cutOf(index: number, box: PlayBox) {
  const swipe = SWIPES[FRUITS[index].swipe];
  let best: { at: number; distance: number } = { at: swipe.start, distance: Infinity };
  const samples = 48;
  for (let i = 0; i <= samples; i++) {
    const at = swipe.start + ((swipe.end - swipe.start) * i) / samples;
    const blade = bladeAt(FRUITS[index].swipe, at, box);
    const fruit = fruitAt(index, at, box);
    const distance = Math.hypot(blade.x - fruit.x, blade.y - fruit.y);
    if (distance < best.distance) best = { at, distance };
  }
  const from = boxPoint(box, swipe.from.u, swipe.from.v);
  const to = boxPoint(box, swipe.to.u, swipe.to.v);
  return { ...best, angle: Math.atan2(to.y - from.y, to.x - from.x) };
}

/** Where the hand is: coming in, slashing, swinging back for the second slash, then resting. */
function cursorPoint(local: number, box: PlayBox): Point {
  const [first, second] = SWIPES;
  if (local < first.start) return glide(local, CURSOR.in, first.start, boxPoint(box, CURSOR.enter.u, CURSOR.enter.v), bladeAt(0, first.start, box), 26);
  if (local < first.end) return bladeAt(0, local, box);
  if (local < second.start) return glide(local, first.end + 0.04, second.start, bladeAt(0, first.end, box), bladeAt(1, second.start, box), 40);
  if (local < second.end) return bladeAt(1, local, box);
  return glide(local, second.end, second.end + 0.3, bladeAt(1, second.end, box), boxPoint(box, 0.12, 0.5), 0);
}

/** Slice: fruit is thrown up, and a swipe of the hand cuts it in two. */
export function sliceAt(local: number, box: PlayBox): SliceState {
  const k = sizeScale(box);
  const whole: WholeFruit[] = [];
  const halves: FruitHalf[] = [];
  const juice: Drop[] = [];
  const cuts = FRUITS.map((_, i) => cutOf(i, box));
  FRUITS.forEach((fruit, i) => {
    const r = fruit.radius * k;
    if (local < launchTime(i, box)) return;
    const cut = cuts[i];
    const at = fruitAt(i, local, box);
    if (local < cut.at) {
      whole.push({ kind: fruit.kind, x: at.x, y: at.y, r, angle: fruit.spin * (local - fruit.peak.at) });
      return;
    }
    // The halves keep the fruit's arc and drift apart across the cut, each spinning away.
    const since = local - cut.at;
    const normal = { x: -Math.sin(cut.angle), y: Math.cos(cut.angle) };
    const cutDegrees = (cut.angle * 180) / Math.PI;
    const sinking = 1 - progress(at.y, box.ground - r, box.ground + r);
    for (const side of [-1, 1]) {
      halves.push({
        kind: fruit.kind,
        x: at.x + side * normal.x * (HALF_SPEED * since + r * 0.15),
        y: at.y + side * normal.y * (HALF_SPEED * since + r * 0.15),
        r,
        angle: cutDegrees + (side < 0 ? 180 : 0) + side * 140 * since,
        opacity: sinking,
      });
    }
    // Juice sprays along the blade and falls.
    const spray = Math.min(1, since / 0.55);
    if (spray < 1) {
      for (let d = 0; d < JUICE; d++) {
        const spread = cut.angle + (d - (JUICE - 1) / 2) * 0.32;
        const speed = (150 + 40 * (d % 3)) * k;
        juice.push({
          kind: fruit.kind,
          x: at.x + Math.cos(spread) * speed * since,
          y: at.y + Math.sin(spread) * speed * since + 0.5 * GRAVITY * since * since,
          r: (4.5 - (d % 3)) * k * (1 - 0.5 * spray),
          opacity: 1 - spray,
        });
      }
    }
  });

  const trail: Point[] = [];
  const swipeIndex = SWIPES.findIndex((s) => local >= s.start && local <= s.end + TRAIL.seconds);
  if (swipeIndex >= 0) {
    const swipe = SWIPES[swipeIndex];
    for (let i = TRAIL.samples; i >= 0; i--) {
      const at = Math.min(Math.max(local - (TRAIL.seconds * i) / TRAIL.samples, swipe.start), swipe.end);
      trail.push(bladeAt(swipeIndex, at, box));
    }
  }

  const cursor: CursorState = {
    point: cursorPoint(local, box),
    shown: shownBetween(local, CURSOR.in, CURSOR.out, 0.25, 0.3),
    fill: 0,
    swell: 0,
  };
  const nextFruit = cuts.findIndex((cut) => local < cut.at);
  const look = nextFruit >= 0 && local >= launchTime(nextFruit, box) ? fruitAt(nextFruit, local, box) : cursor.point;
  return { whole, halves, juice, trail, cursor, look };
}

/** The mascot slashes along with the swipes and gasps at each cut. */
export function slicePose(pose: MascotPose, local: number): MascotPose {
  const slash = SWIPES.reduce((sum, s, i) => sum + (i === 0 ? 1 : -1) * hop(local, s.start - 0.04, s.end - s.start + 0.2), 0);
  const gasp = SWIPES.reduce((sum, s) => sum + hop(local, s.start, 0.5), 0);
  const settle = SWIPES.reduce((sum, s) => sum + (local > s.end ? 0.3 * wobble(local - s.end, 2.6, 6) : 0), 0);
  return {
    ...pose,
    wave: pose.wave + 26 * slash,
    mouth: Math.min(1, pose.mouth + 0.6 * gasp),
    bounce: pose.bounce - 22 * gasp,
    squash: pose.squash + settle,
    antenna: pose.antenna - 10 * slash,
  };
}
