import { describe, expect, it } from "vitest";
import { FORMATS } from "../constants";
import { cameraAt, cameraTransform, DIVE_SECONDS, PULL_BACK_SECONDS, roomAmount } from "./camera";
import { FILM_LENGTH, SCENE_STARTS } from "./timeline";

describe("camera", () => {
  it("sits inside the TV screen, pulls back to the room, then dives back in", () => {
    expect(roomAmount(0)).toBe(0);
    expect(roomAmount(SCENE_STARTS.tv)).toBe(0);
    expect(roomAmount(SCENE_STARTS.tv + PULL_BACK_SECONDS)).toBe(1);
    expect(roomAmount(SCENE_STARTS.dive - 0.01)).toBe(1);
    expect(roomAmount(SCENE_STARTS.dive + DIVE_SECONDS)).toBe(0);
    expect(roomAmount(FILM_LENGTH)).toBe(0);
  });

  it("frames the same shot at the end of the loop as at its start", () => {
    const expectShot = (actual: { x: number; y: number; scale: number }, expected: typeof actual) => {
      expect(actual.x).toBeCloseTo(expected.x, 6);
      expect(actual.y).toBeCloseTo(expected.y, 6);
      expect(actual.scale).toBeCloseTo(expected.scale, 6);
    };
    for (const format of Object.values(FORMATS)) {
      expectShot(cameraAt(0, format), format.screenShot);
      expectShot(cameraAt(FILM_LENGTH - 1e-6, format), format.screenShot);
      expectShot(cameraAt(SCENE_STARTS.dive - 0.01, format), format.roomShot);
    }
  });

  it("zooms evenly in log space, so halfway is the geometric mean of the zooms", () => {
    const format = FORMATS.desktop;
    let halfway = SCENE_STARTS.tv;
    while (roomAmount(halfway) < 0.5) halfway += 0.0005;
    expect(cameraAt(halfway, format).scale).toBeCloseTo(Math.sqrt(format.screenShot.scale * format.roomShot.scale), 2);
  });

  it("puts the shot's room point at the stage centre", () => {
    const format = FORMATS.desktop;
    const shot = { x: 1000, y: 500, scale: 2 };
    expect(cameraTransform(shot, format)).toBe("translate(-1040.00 -520.00) scale(2.00000)");
  });
});
