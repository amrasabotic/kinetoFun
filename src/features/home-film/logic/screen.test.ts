import { describe, expect, it } from "vitest";
import { FORMATS, ROOM } from "../constants";
import type { FilmFormat } from "../types";
import { logoScale, mascotHeight } from "./mascot-space";
import { STOPS } from "./route";
import { screenAt } from "./screen";
import { FILM_LENGTH, SCENE_STARTS, sceneAt } from "./timeline";

/** The lowest screen row the camera shows from inside the TV screen. */
const visibleBottom = (format: FilmFormat) =>
  Math.min(ROOM.screen.height, format.screenShot.y + format.height / 2 / format.screenShot.scale - ROOM.screen.y);

/** The top of the mascot (its antenna's signal) on the TV screen. */
function mascotTop(time: number, format: FilmFormat) {
  const { spot, pose } = screenAt(time, format);
  return spot.y + pose.bounce * logoScale(spot.width) - mascotHeight(spot.width);
}

function allNumbers(value: unknown, path = "frame"): [string, number][] {
  if (typeof value === "number") return [[path, value]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, v]) => allNumbers(v, `${path}.${key}`));
  return [];
}

describe("screenAt", () => {
  for (const format of Object.values(FORMATS)) {
    describe(format.key, () => {
      it("hides the mascot below the screen at both ends of the loop, so the seam does not show", () => {
        expect(mascotTop(0, format)).toBeGreaterThan(visibleBottom(format));
        expect(mascotTop(FILM_LENGTH - 1e-6, format)).toBeGreaterThan(visibleBottom(format));
        for (const time of [0, FILM_LENGTH - 1e-6]) {
          const frame = screenAt(time, format);
          expect(frame.cursor).toBeNull();
          expect(frame.stop).toBeNull();
          expect(frame.pose.decor).toBe(0);
        }
      });

      it("shows the stop being played, with its own props, only during that stop", () => {
        for (const stop of STOPS) {
          expect(screenAt(SCENE_STARTS[stop] + 0.5, format).stop?.name).toBe(stop);
        }
        expect(screenAt(SCENE_STARTS.tv + 1, format).stop).toBeNull();
        expect(screenAt(SCENE_STARTS.bye + 1, format).stop).toBeNull();
      });

      it("produces finite numbers in every frame of the loop", () => {
        for (let time = 0; time < FILM_LENGTH; time += 1 / 60) {
          for (const [path, value] of allNumbers(screenAt(time, format))) {
            if (!Number.isFinite(value)) throw new Error(`${path} is ${value} at ${time.toFixed(3)} s in ${sceneAt(time)}`);
          }
        }
      });

      it("never moves the mascot across the screen faster than a brisk walk", () => {
        let last = screenAt(0, format).spot;
        for (let time = 1 / 60; time < FILM_LENGTH; time += 1 / 60) {
          const spot = screenAt(time, format).spot;
          expect(Math.abs(spot.x - last.x), `at ${time.toFixed(3)} s`).toBeLessThan(10);
          expect(Math.abs(spot.width - last.width), `at ${time.toFixed(3)} s`).toBeLessThan(4);
          last = spot;
        }
      });
    });
  }
});
