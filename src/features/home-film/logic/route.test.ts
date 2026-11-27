import { describe, expect, it } from "vitest";
import { FORMATS, ROOM } from "../constants";
import { FRAME_WIDTH, logoScale, mascotHeight } from "./mascot-space";
import { groundSpot, routeFor, STOP_SPOTS, STOPS, WALK_SECONDS } from "./route";
import { FILM_LENGTH, SCENE_STARTS, sceneEnd } from "./timeline";

/** The part of the TV screen the camera shows when it is inside the screen, in screen units. */
function visibleScreen(format: (typeof FORMATS)[keyof typeof FORMATS]) {
  const shot = format.screenShot;
  const halfWidth = format.width / 2 / shot.scale;
  const halfHeight = format.height / 2 / shot.scale;
  return {
    left: Math.max(0, shot.x - halfWidth - ROOM.screen.x),
    right: Math.min(ROOM.screen.width, shot.x + halfWidth - ROOM.screen.x),
    top: Math.max(0, shot.y - halfHeight - ROOM.screen.y),
    bottom: Math.min(ROOM.screen.height, shot.y + halfHeight - ROOM.screen.y),
  };
}

describe("route", () => {
  for (const format of Object.values(FORMATS)) {
    describe(format.key, () => {
      const route = routeFor(format);

      it("starts and ends where the mascot says hello, so the loop closes", () => {
        expect(route[0].spot).toEqual(format.helloMascot);
        expect(route[route.length - 1].spot).toEqual(format.helloMascot);
        expect(route[route.length - 1].at).toBeLessThan(FILM_LENGTH);
      });

      it("keeps its marks in time order", () => {
        for (let i = 1; i < route.length; i++) expect(route[i].at).toBeGreaterThanOrEqual(route[i - 1].at);
      });

      it("finishes each walk inside its stop", () => {
        for (const stop of STOPS) expect(SCENE_STARTS[stop] + WALK_SECONDS[stop]).toBeLessThan(sceneEnd(stop));
      });

      it("keeps the mascot, hand and all, on screen at every stop", () => {
        const view = visibleScreen(format);
        const scale = logoScale(format.playBox.mascot);
        for (const stop of STOPS) {
          const spot = groundSpot(format.playBox, STOP_SPOTS[stop]);
          // The logo hand reaches 297 logo pixels left of the base; the body 159 to the right.
          expect(spot.x - 297 * scale).toBeGreaterThanOrEqual(view.left);
          expect(spot.x + 159 * scale).toBeLessThanOrEqual(view.right);
          expect(spot.y - mascotHeight(spot.width)).toBeGreaterThanOrEqual(view.top);
          expect(spot.y).toBeLessThanOrEqual(view.bottom);
        }
      });

      it("uses the play box's mascot size", () => {
        expect(groundSpot(format.playBox, 0.5).width).toBe(format.playBox.mascot);
        expect(format.playBox.mascot).toBeLessThan(FRAME_WIDTH);
      });
    });
  }
});
