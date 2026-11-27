import type { FilmFormat, LineKey, SceneName } from "../types";
import { SCENE_STARTS } from "./timeline";
import { ease, progress } from "./motion";

export type LineCue = { enter: number; exit: number };

/** A cue in seconds from the start of a scene. */
const within = (scene: SceneName, enter: number, exit: number): LineCue => ({
  enter: SCENE_STARTS[scene] + enter,
  exit: SCENE_STARTS[scene] + exit,
});

/**
 * When each set of words comes in and goes out, in seconds of film time.
 * Every set holds fully in place for at least 1.2 seconds, and leaves its
 * box before the next set in that box arrives.
 */
export const LINE_CUES: Record<LineKey, LineCue> = {
  hello: within("hello", 0.5, 2.68),
  camera: within("tv", 1.35, 3.55),
  pop: within("pop", 0.2, 2.25),
  slice: within("slice", 0.2, 2.25),
  catch: within("catch", 0.2, 2.4),
  learn: within("learn", 0.2, 2.32),
  library: within("library", 0.2, 2.5),
  rewards: within("rewards", 0.25, 2.6),
  // The goodbye leaves with the mascot as it sinks out of view.
  bye: within("bye", 0.07, 2.22),
};

/** The box each set of words sits in: the caption in the room has its own, the rest share the one inside the TV. */
export const LINE_BOXES: Record<LineKey, keyof Pick<FilmFormat, "helloText" | "captionText">> = {
  hello: "helloText",
  camera: "captionText",
  pop: "helloText",
  slice: "helloText",
  catch: "helloText",
  learn: "helloText",
  library: "helloText",
  rewards: "helloText",
  bye: "helloText",
};

export const LINE_KEYS = Object.keys(LINE_CUES) as LineKey[];

const ENTER_SECONDS = 0.65;
const ENTER_STAGGER = 0.07;
const EXIT_SECONDS = 0.32;
const EXIT_STAGGER = 0.035;

/**
 * One word of a kinetic line at `time`: how far it sits below its place, as a
 * fraction of the line box (1 is fully hidden under the mask, negative has
 * left through the top), and its tilt in degrees. Words are counted across
 * all lines, so the stagger runs on from one line to the next.
 */
export function wordMotion(time: number, cue: LineCue, index: number) {
  const enterAt = cue.enter + index * ENTER_STAGGER;
  const exitAt = cue.exit + index * EXIT_STAGGER;
  const shown = ease.enter(progress(time, enterAt, enterAt + ENTER_SECONDS));
  const gone = ease.leave(progress(time, exitAt, exitAt + EXIT_SECONDS));
  return {
    offset: 1 - shown - gone,
    tilt: 7 * (1 - shown),
    visible: shown > 0 && gone < 1,
  };
}
