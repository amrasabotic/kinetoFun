import type { Spot } from "../types";
import { ease, lerp, progress } from "./motion";

/** A walk takes steps; a glide carries the mascot without them, as the camera moves. */
export type Move = "walk" | "glide";

/** A mark on the mascot's route: where it stands at `at` seconds, and how it got there from the mark before. */
export type Mark = { at: number; spot: Spot; move: Move };

/** What walking adds to a pose: logo pixels and degrees, and which way it is heading (-1 left, 1 right). */
export type Gait = {
  bounce: number;
  squash: number;
  lean: number;
  footLeft: number;
  footRight: number;
  heading: number;
};

export const STILL: Gait = { bounce: 0, squash: 0, lean: 0, footLeft: 0, footRight: 0, heading: 0 };

const STEPS_PER_SECOND = 4.2;
/** Logo pixels the body rises over each step. */
const BOB = 16;
/** Logo pixels a stepping foot lifts; more than the bob, so it tucks up behind the body. */
const LIFT = 28;
/** Degrees the body rocks onto its planted foot. */
const ROCK = 5;
/** Degrees it leans into the walk at full speed. */
const LEAN = 4;

/**
 * The waddle of a walk from `start` to `end`, seen from the front. It takes
 * whole steps, so it starts and ends with both feet down: the body rises
 * over the planted foot and rocks onto it while the other foot steps.
 */
export function gait(time: number, start: number, end: number, heading: number): Gait {
  const p = progress(time, start, end);
  if (p <= 0 || p >= 1) return STILL;
  const steps = Math.max(2, Math.round((end - start) * STEPS_PER_SECOND));
  const phase = p * steps;
  const step = Math.floor(phase);
  const rise = Math.sin(Math.PI * (phase - step));
  const leftSteps = step % 2 === 0;
  const planted = BOB * rise;
  const stepping = (BOB - LIFT) * rise;
  return {
    bounce: -planted,
    squash: -0.1 * rise,
    lean: (leftSteps ? ROCK : -ROCK) * rise + LEAN * heading * Math.sin(Math.PI * p),
    footLeft: leftSteps ? stepping : planted,
    footRight: leftSteps ? planted : stepping,
    heading,
  };
}

/** Where the mascot stands on its route at `time`, and what its walk adds to the pose. */
export function routeAt(time: number, marks: readonly Mark[]): { spot: Spot; gait: Gait } {
  if (marks.length === 0) throw new Error("A route needs at least one mark.");
  if (time <= marks[0].at) return { spot: marks[0].spot, gait: STILL };
  for (let i = 1; i < marks.length; i++) {
    const from = marks[i - 1];
    const to = marks[i];
    if (time >= to.at) continue;
    const p = progress(time, from.at, to.at);
    const amount = to.move === "walk" ? ease.stroll(p) : ease.glide(p);
    const spot = {
      x: lerp(from.spot.x, to.spot.x, amount),
      y: lerp(from.spot.y, to.spot.y, amount),
      width: lerp(from.spot.width, to.spot.width, amount),
    };
    const heading = Math.sign(to.spot.x - from.spot.x);
    return { spot, gait: to.move === "walk" ? gait(time, from.at, to.at, heading) : STILL };
  }
  return { spot: marks[marks.length - 1].spot, gait: STILL };
}
