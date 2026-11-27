import { describe, expect, it } from "vitest";
import { advanceLoop, fitStage, MAX_STEP, pickFrameRate, shouldDraw } from "./loop";

describe("advanceLoop", () => {
  it("moves the clock on and wraps it into the loop", () => {
    expect(advanceLoop(1, 0.016, 27)).toBeCloseTo(1.016);
    expect(advanceLoop(26.99, 0.05, 27)).toBeCloseTo(0.04);
  });

  it("never jumps more than one step after a throttled tab, and never runs backwards", () => {
    expect(advanceLoop(5, 30, 27)).toBeCloseTo(5 + MAX_STEP);
    expect(advanceLoop(5, -1, 27)).toBe(5);
  });
});

describe("fitStage", () => {
  it("covers the box and centres the overflow", () => {
    const fit = fitStage({ width: 1000, height: 400 }, { width: 1920, height: 960 });
    expect(fit.scale).toBeCloseTo(1000 / 1920);
    expect(960 * fit.scale).toBeGreaterThanOrEqual(400);
    expect(fit.left).toBeCloseTo(0, 9);
    expect(fit.top).toBeCloseTo((400 - 960 * fit.scale) / 2);
  });

  it("draws nothing into an empty box", () => {
    expect(fitStage({ width: 0, height: 300 }, { width: 1920, height: 960 }).scale).toBe(0);
  });
});

describe("frame pacing", () => {
  it("draws every refresh at 60 and every second one of a 60 Hz screen at 30", () => {
    expect(shouldDraw(16.7, 0, 60)).toBe(true);
    expect(shouldDraw(16.7, 0, 30)).toBe(false);
    expect(shouldDraw(33.4, 0, 30)).toBe(true);
  });

  it("drops to 30 fps only once most recent frames run long", () => {
    expect(pickFrameRate([30, 30])).toBe(60);
    expect(pickFrameRate(Array(30).fill(16.7))).toBe(60);
    expect(pickFrameRate(Array(30).fill(30))).toBe(30);
  });
});
