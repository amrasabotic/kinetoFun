import { describe, expect, it } from "vitest";
import { bump, clamp, cubicBezier, ease, lerp, progress, wobble } from "./motion";

describe("progress", () => {
  it("runs from 0 to 1 across the span and holds outside it", () => {
    expect(progress(0, 1, 3)).toBe(0);
    expect(progress(2, 1, 3)).toBe(0.5);
    expect(progress(5, 1, 3)).toBe(1);
  });

  it("steps at the end of an empty span instead of dividing by zero", () => {
    expect(progress(0.9, 1, 1)).toBe(0);
    expect(progress(1, 1, 1)).toBe(1);
  });
});

describe("cubicBezier", () => {
  it("starts at 0, ends at 1 and never runs backwards for a monotonic curve", () => {
    const curve = cubicBezier(0.65, 0, 0.35, 1);
    let last = 0;
    for (let x = 0; x <= 1.0001; x += 0.01) {
      const y = curve(x);
      expect(y).toBeGreaterThanOrEqual(last - 1e-9);
      last = y;
    }
    expect(curve(0)).toBe(0);
    expect(curve(1)).toBe(1);
  });

  it("matches the linear curve when its handles lie on the diagonal", () => {
    const linear = cubicBezier(1 / 3, 1 / 3, 2 / 3, 2 / 3);
    for (const x of [0.1, 0.37, 0.5, 0.82]) expect(linear(x)).toBeCloseTo(x, 4);
  });
});

describe("ease", () => {
  it("every easing starts at 0 and lands on 1", () => {
    for (const curve of Object.values(ease)) {
      expect(curve(0)).toBe(0);
      expect(curve(1)).toBe(1);
    }
  });

  it("pop passes its target before settling", () => {
    const peak = Math.max(...Array.from({ length: 100 }, (_, i) => ease.pop(i / 100)));
    expect(peak).toBeGreaterThan(1.05);
  });
});

describe("small helpers", () => {
  it("clamp and lerp", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it("wobble is still before its impulse and dies away after it", () => {
    expect(wobble(0)).toBe(0);
    expect(wobble(-1)).toBe(0);
    expect(Math.abs(wobble(0.001))).toBeCloseTo(1, 1);
    expect(Math.abs(wobble(2))).toBeLessThan(1e-3);
  });

  it("bump rises from 0 to 1 and back over its span", () => {
    expect(bump(0, 0, 1)).toBe(0);
    expect(bump(0.5, 0, 1)).toBeCloseTo(1);
    expect(bump(1, 0, 1)).toBeCloseTo(0);
  });
});
