import type { CameraShot, FilmFormat } from "../types";
import { SCENE_STARTS } from "./timeline";
import { ease, lerp, progress } from "./motion";

/** Seconds the camera takes to pull back from the TV screen to the room. */
export const PULL_BACK_SECONDS = 1.5;

/** Seconds the camera takes to dive back into the screen, the whole dive scene. */
export const DIVE_SECONDS = 1;

/**
 * How much of the room is in view, eased, from 0 (inside the TV screen) to
 * 1 (the whole room): the camera pulls back in the TV scene and dives into
 * the screen again in the dive scene.
 */
export function roomAmount(time: number) {
  const out = ease.glide(progress(time, SCENE_STARTS.tv, SCENE_STARTS.tv + PULL_BACK_SECONDS));
  const back = ease.glide(progress(time, SCENE_STARTS.dive, SCENE_STARTS.dive + DIVE_SECONDS));
  return out * (1 - back);
}

/**
 * Where the camera looks at `time`, between the shot inside the TV screen
 * and the shot of the room. The zoom is eased in log space so the move
 * feels even instead of rushing at one end.
 */
export function cameraAt(time: number, format: FilmFormat): CameraShot {
  const amount = roomAmount(time);
  const from = format.screenShot;
  const to = format.roomShot;
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
    scale: Math.exp(lerp(Math.log(from.scale), Math.log(to.scale), amount)),
  };
}

/** The SVG transform that puts the camera's view of the room on the stage. */
export function cameraTransform(shot: CameraShot, format: FilmFormat) {
  const tx = format.width / 2 - shot.x * shot.scale;
  const ty = format.height / 2 - shot.y * shot.scale;
  return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${shot.scale.toFixed(5)})`;
}
