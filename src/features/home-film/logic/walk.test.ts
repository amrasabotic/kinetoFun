import { describe, expect, it } from "vitest";
import { gait, routeAt, STILL, type Mark } from "./walk";

describe("gait", () => {
  it("is still before and after the walk", () => {
    expect(gait(0.9, 1, 2, 1)).toEqual(STILL);
    expect(gait(2, 1, 2, 1)).toEqual(STILL);
  });

  it("keeps one foot planted while the other steps, and alternates them", () => {
    const steppers = new Set<string>();
    for (let t = 1.01; t < 2; t += 0.01) {
      const g = gait(t, 1, 2, 1);
      // The planted foot reaches down exactly as far as the body has risen.
      const planted = Math.max(g.footLeft, g.footRight);
      expect(planted).toBeCloseTo(-g.bounce, 9);
      expect(Math.min(g.footLeft, g.footRight)).toBeLessThanOrEqual(0);
      if (Math.abs(g.bounce) > 1) steppers.add(g.footLeft < g.footRight ? "left" : "right");
    }
    expect(steppers).toEqual(new Set(["left", "right"]));
  });

  it("lands every step: both feet are down between steps", () => {
    // A one second walk takes four steps, so the second one ends halfway.
    const g = gait(1.5, 1, 2, 1);
    expect(Math.abs(g.bounce)).toBeLessThan(1e-9);
    expect(Math.abs(g.footLeft) + Math.abs(g.footRight)).toBeLessThan(1e-9);
  });

  it("leans into the direction it walks", () => {
    const right = gait(1.5, 1, 2, 1).lean - gait(1.5, 1, 2, 0).lean;
    const left = gait(1.5, 1, 2, -1).lean - gait(1.5, 1, 2, 0).lean;
    expect(right).toBeGreaterThan(0);
    expect(left).toBeLessThan(0);
  });
});

describe("routeAt", () => {
  const a = { x: 0, y: 100, width: 100 };
  const b = { x: 200, y: 100, width: 100 };
  const marks: Mark[] = [
    { at: 0, spot: a, move: "glide" },
    { at: 1, spot: a, move: "glide" },
    { at: 2, spot: b, move: "walk" },
  ];

  it("holds the first and last spots outside the route", () => {
    expect(routeAt(-1, marks).spot).toEqual(a);
    expect(routeAt(3, marks).spot).toEqual(b);
  });

  it("walks between marks with steps, and glides without them", () => {
    const walking = routeAt(1.5, marks);
    expect(walking.spot.x).toBeCloseTo(100, 6);
    expect(walking.gait.heading).toBe(1);
    expect(routeAt(0.5, marks).gait).toEqual(STILL);
  });

  it("refuses an empty route", () => {
    expect(() => routeAt(0, [])).toThrow();
  });
});
