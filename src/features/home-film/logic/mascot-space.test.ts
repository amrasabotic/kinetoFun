import { describe, expect, it } from "vitest";
import { ANCHORS, fromLogo, handPoint, lookAt } from "./mascot-space";

const spot = { x: 400, y: 300, width: 300 };

describe("mascot space", () => {
  it("puts the base of the mascot on its spot", () => {
    expect(fromLogo(spot, ANCHORS.base)).toEqual({ x: 400, y: 300 });
  });

  it("scales logo pixels to the spot's width and lifts with the bounce", () => {
    expect(fromLogo(spot, { x: ANCHORS.base.x + 100, y: ANCHORS.base.y })).toEqual({ x: 450, y: 300 });
    expect(fromLogo(spot, ANCHORS.base, -100).y).toBe(250);
  });

  it("mirrors the second hand across the middle of the TV", () => {
    const first = handPoint(spot, ANCHORS.palm, 16);
    const second = handPoint(spot, ANCHORS.palm2, 16, true);
    expect(second.x - spot.x).toBeCloseTo(spot.x - first.x, 6);
    expect(second.y).toBeCloseTo(first.y, 6);
  });

  it("leaves an unturned hand where the logo draws it", () => {
    const point = handPoint(spot, ANCHORS.palm, 0);
    expect(point).toEqual(fromLogo(spot, ANCHORS.palm));
  });

  it("turns the eyes towards a target, never past their reach", () => {
    const right = lookAt(spot, { x: 2000, y: 200 });
    expect(right.lookX).toBeGreaterThan(8);
    expect(Math.hypot(right.lookX, right.lookY)).toBeLessThanOrEqual(9.0001);
    expect(lookAt(spot, fromLogo(spot, ANCHORS.eyes))).toEqual({ lookX: 0, lookY: 0 });
  });
});
