import { SCENES } from "../constants";
import type { SceneName } from "../types";

// Sums of decimal seconds drift (3.0 + 3.8 is not exactly 6.8), so cues are kept to the millisecond.
const toMilliseconds = (seconds: number) => Math.round(seconds * 1000) / 1000;

function buildStarts() {
  const starts = {} as Record<SceneName, number>;
  let at = 0;
  for (const scene of SCENES) {
    starts[scene.name] = at;
    at = toMilliseconds(at + scene.seconds);
  }
  return { starts, length: at };
}

const built = buildStarts();

/** When each scene starts, in seconds of film time. */
export const SCENE_STARTS: Readonly<Record<SceneName, number>> = built.starts;

/** The length of one loop of the film, in seconds. */
export const FILM_LENGTH = built.length;

/** When a scene hands over to the next; the last one ends with the loop. */
export function sceneEnd(name: SceneName) {
  const index = SCENES.findIndex((scene) => scene.name === name);
  const next = SCENES[index + 1];
  return next ? SCENE_STARTS[next.name] : FILM_LENGTH;
}

/** The scene on screen at a film time from 0 up to the film's length. */
export function sceneAt(time: number): SceneName {
  let current = SCENES[0].name;
  for (const scene of SCENES) {
    if (time >= SCENE_STARTS[scene.name]) current = scene.name;
  }
  return current;
}
