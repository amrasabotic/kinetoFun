import type { BurstState, CursorState, MascotPose, PlayBox, Point } from "../../types";
import { ease, wobble } from "../motion";
import { boxPoint, glide, heightScale, hop, shownBetween, sizeScale, tremor } from "./shared";

/** Balloons in the order they appear: where across the play box, when, and how big. */
const BALLOONS = [
  { across: 0.53, appear: 0.1, size: 1, phase: 0 },
  { across: 0.88, appear: 0.25, size: 0.92, phase: 1.9 },
  { across: 0.69, appear: 0.4, size: 1.06, phase: 3.4 },
  { across: 0.81, appear: 0.55, size: 0.86, phase: 5.1 },
] as const;

/** Which balloons the cursor pops, and when. */
export const POPS = [
  { balloon: 1, at: 1.25 },
  { balloon: 2, at: 1.75 },
] as const;

const RADIUS = 30;
const RISE_SPEED = 85;
/** At the end the balloons left over speed up and float away. */
const AWAY = { at: 2.12, pull: 1500 };
const INFLATE_SECONDS = 0.3;
const CURSOR = { in: 0.55, out: 2.2, start: { u: 0.48, v: 0.78 } };

export type BalloonState = { x: number; y: number; r: number; scale: number; tilt: number };

export type PopState = {
  /** One entry per balloon; null once it has popped or before it appears. */
  balloons: (BalloonState | null)[];
  bursts: BurstState[];
  cursor: CursorState;
  look: Point;
};

/** A balloon's place and size, whether or not it is on screen yet. */
function balloonAt(index: number, local: number, box: PlayBox): BalloonState {
  const balloon = BALLOONS[index];
  const k = sizeScale(box);
  const r = RADIUS * k * balloon.size;
  const since = Math.max(0, local - balloon.appear);
  const floating = Math.max(0, since - INFLATE_SECONDS * 0.5);
  const away = Math.max(0, local - AWAY.at);
  const rise = (RISE_SPEED * floating + AWAY.pull * away * away) * heightScale(box);
  const sway = Math.sin(2 * Math.PI * 0.7 * floating + balloon.phase);
  const home = boxPoint(box, balloon.across, 0);
  return {
    x: home.x + 7 * k * sway,
    y: box.ground - r * 1.9 - rise,
    r,
    scale: ease.pop(Math.min(1, since / INFLATE_SECONDS)),
    tilt: 6 * Math.sin(2 * Math.PI * 0.7 * floating + balloon.phase + 0.6),
  };
}

/** Pop: balloons float up beside the mascot, and pointing at one pops it. */
export function popAt(local: number, box: PlayBox): PopState {
  const balloons = BALLOONS.map((balloon, i) => {
    const popped = POPS.some((p) => p.balloon === i && local >= p.at);
    return local < balloon.appear || popped ? null : balloonAt(i, local, box);
  });
  const bursts = POPS.filter((p) => local >= p.at).map((p) => ({
    at: balloonAt(p.balloon, p.at, box),
    amount: Math.min(1, (local - p.at) / 0.7),
  }));

  // The cursor chases each balloon it pops, landing on it as it pops.
  const start = boxPoint(box, CURSOR.start.u, CURSOR.start.v);
  const target = (i: number) => balloonAt(POPS[i].balloon, Math.min(local, POPS[i].at), box);
  let point: Point;
  if (local < POPS[0].at) point = glide(local, CURSOR.in, POPS[0].at, start, target(0), 30);
  else if (local < POPS[1].at) point = glide(local, POPS[0].at + 0.08, POPS[1].at, target(0), target(1), -24);
  else point = target(1);
  const still = tremor(local);
  const cursor: CursorState = {
    point: { x: point.x + still.x, y: point.y + still.y },
    shown: shownBetween(local, CURSOR.in, CURSOR.out, 0.3, 0.3),
    fill: 0,
    swell: POPS.reduce((sum, p) => sum + hop(local, p.at, 0.25), 0),
  };
  return { balloons, bursts, cursor, look: cursor.shown > 0.2 ? cursor.point : boxPoint(box, 0.75, 0.5) };
}

/** The mascot cheers each pop with a hop and a flick of the hand. */
export function popPose(pose: MascotPose, local: number): MascotPose {
  const cheer = POPS.reduce((sum, p) => sum + hop(local, p.at + 0.04, 0.36), 0);
  const landing = POPS.reduce((sum, p) => sum + (local > p.at + 0.4 ? 0.4 * wobble(local - p.at - 0.4, 2.4, 6) : 0), 0);
  return {
    ...pose,
    bounce: pose.bounce - 46 * cheer,
    squash: pose.squash - 0.3 * cheer + landing,
    wave: pose.wave + 22 * cheer,
    mouth: Math.min(1, pose.mouth + cheer),
    wink: hop(local, POPS[1].at + 0.05, 0.5),
  };
}
