import { TV_MASCOT } from "../constants";
import type { FilmFormat, PlayBox, Spot, StopName } from "../types";
import { SCENE_STARTS } from "./timeline";
import type { Mark } from "./walk";

/** The stops in the order the film plays them. */
export const STOPS: readonly StopName[] = ["pop", "slice", "catch", "learn", "library", "rewards"];

/** Where the mascot stands in each stop, across the play box from 0 (left) to 1 (right). */
export const STOP_SPOTS: Record<StopName, number> = {
  pop: 0.26,
  slice: 0.76,
  catch: 0.5,
  learn: 0.26,
  library: 0.74,
  rewards: 0.5,
};

/** Seconds each stop opens with the mascot walking to its spot; longer walks get more time. */
export const WALK_SECONDS: Record<StopName, number> = {
  pop: 0.6,
  slice: 0.8,
  catch: 0.6,
  learn: 0.6,
  library: 0.8,
  rewards: 0.6,
};

/** Seconds the camera dive takes to bring the mascot down to the play box. */
const DIVE_MOVE = 0.9;

/** Seconds the mascot takes to walk from the last stop back to where it said hello. */
export const BYE_WALK = 0.75;

/** The mascot's spot on the ground of the play box, `across` from 0 (left) to 1 (right). */
export const groundSpot = (box: PlayBox, across: number): Spot => ({
  x: box.x + across * box.width,
  y: box.ground,
  width: box.mascot,
});

function buildRoute(format: FilmFormat): Mark[] {
  const box = format.playBox;
  const centre = groundSpot(box, 0.5);
  const marks: Mark[] = [
    { at: 0, spot: format.helloMascot, move: "glide" },
    { at: SCENE_STARTS.tv + 0.15, spot: format.helloMascot, move: "glide" },
    { at: SCENE_STARTS.tv + 1.35, spot: TV_MASCOT, move: "glide" },
    { at: SCENE_STARTS.dive, spot: TV_MASCOT, move: "glide" },
    { at: SCENE_STARTS.dive + DIVE_MOVE, spot: centre, move: "glide" },
  ];
  let last = centre;
  for (const stop of STOPS) {
    const spot = groundSpot(box, STOP_SPOTS[stop]);
    marks.push(
      { at: SCENE_STARTS[stop], spot: last, move: "glide" },
      { at: SCENE_STARTS[stop] + WALK_SECONDS[stop], spot, move: "walk" },
    );
    last = spot;
  }
  marks.push(
    { at: SCENE_STARTS.bye, spot: last, move: "glide" },
    { at: SCENE_STARTS.bye + BYE_WALK, spot: format.helloMascot, move: "walk" },
  );
  return marks;
}

const routes = new WeakMap<FilmFormat, Mark[]>();

/**
 * The mascot's route through the whole film on `format`: it says hello,
 * moves to the middle of the TV while the room is in view, comes down to
 * the play box as the camera dives, walks to each stop's spot, and walks
 * back to where it said hello to say goodbye.
 */
export function routeFor(format: FilmFormat): readonly Mark[] {
  let route = routes.get(format);
  if (!route) {
    route = buildRoute(format);
    routes.set(format, route);
  }
  return route;
}
