import { describe, expect, it } from "vitest";
import { createFramePacer } from "./frame-pacing";

/** Frame times for a camera at `fps`, with optional per-frame offset in ms. */
function frameTimes(fps: number, count: number, offset: (i: number) => number = () => 0): number[] {
  return Array.from({ length: count }, (_, i) => (i * 1000) / fps + offset(i));
}

function acceptedOf(times: number[], maxFps = 30): boolean[] {
  const pace = createFramePacer(maxFps);
  return times.map(pace);
}

describe("createFramePacer", () => {
  it("keeps every frame of a 30 fps camera, including float rounding", () => {
    // Gaps of 33.33 ms computed in floating point fall just under 1000 / 30.
    const accepted = acceptedOf(frameTimes(30, 300, (i) => (i % 2 === 0 ? -1e-9 : 1e-9)));
    expect(accepted.every(Boolean)).toBe(true);
  });

  it("keeps every frame of a 30 fps camera with 3 ms of jitter", () => {
    const jitter = [3, -3, 2, -2, 3, -3, 0, 3, -3, 1];
    const accepted = acceptedOf(frameTimes(30, 300, (i) => jitter[i % jitter.length]));
    expect(accepted.every(Boolean)).toBe(true);
  });

  it("keeps every frame of 25 and 15 fps cameras", () => {
    expect(acceptedOf(frameTimes(25, 100)).every(Boolean)).toBe(true);
    expect(acceptedOf(frameTimes(15, 100)).every(Boolean)).toBe(true);
  });

  it("keeps every second frame of a 60 fps camera", () => {
    const accepted = acceptedOf(frameTimes(60, 120));
    expect(accepted.filter(Boolean)).toHaveLength(60);
    accepted.forEach((kept, i) => expect(kept).toBe(i % 2 === 0));
  });

  it("keeps every second frame of a 60 fps camera with jitter", () => {
    const jitter = [1.5, -1.5, 1, -1, 0.5];
    const accepted = acceptedOf(frameTimes(60, 120, (i) => jitter[i % jitter.length]));
    expect(accepted.filter(Boolean)).toHaveLength(60);
  });

  it("skips a frame more than a quarter interval early, measured from the last kept frame", () => {
    // At 30 fps a gap under 25 ms is skipped.
    expect(acceptedOf([0, 24.9, 49.9])).toEqual([true, false, true]);
    expect(acceptedOf([0, 25.1])).toEqual([true, true]);
  });

  it("keeps every frame when the clock does not advance", () => {
    const pace = createFramePacer(30);
    expect([5000, 5000, 5000, 5000].map(pace)).toEqual([true, true, true, true]);
  });

  it("keeps the first frame after the clock restarts from zero", () => {
    const pace = createFramePacer(30);
    expect(pace(90_000)).toBe(true);
    expect(pace(90_033)).toBe(true);
    expect(pace(0)).toBe(true);
    expect(pace(33)).toBe(true);
  });

  it("keeps the very first frame whatever its time", () => {
    expect(createFramePacer(30)(123.456)).toBe(true);
  });
});
