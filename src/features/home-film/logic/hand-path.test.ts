import { describe, expect, it } from "vitest";
import { ARM, burstAt, CURSOR_TARGET, cursorAt, handAt, reach, trackingAt, TV_CUES } from "./hand-path";
import { SCENE_STARTS } from "./timeline";

const tv = (seconds: number) => SCENE_STARTS.tv + seconds;

describe("reach", () => {
  it("puts the hand on a target within the arm's length", () => {
    const target = { x: ARM.shoulder.x + 60, y: ARM.shoulder.y - 150 };
    const { elbow, hand } = reach(ARM.shoulder, target, ARM.upper, ARM.fore);
    expect(hand.x).toBeCloseTo(target.x, 6);
    expect(hand.y).toBeCloseTo(target.y, 6);
    expect(Math.hypot(elbow.x - ARM.shoulder.x, elbow.y - ARM.shoulder.y)).toBeCloseTo(ARM.upper, 6);
    expect(Math.hypot(hand.x - elbow.x, hand.y - elbow.y)).toBeCloseTo(ARM.fore, 6);
  });

  it("stretches straight towards a target out of reach", () => {
    const { hand } = reach(ARM.shoulder, { x: ARM.shoulder.x, y: ARM.shoulder.y - 1000 }, ARM.upper, ARM.fore);
    expect(ARM.shoulder.y - hand.y).toBeCloseTo(ARM.upper + ARM.fore, 2);
  });
});

describe("the TV scene's cursor", () => {
  it("appears with the raised hand, lands on its target and fills while it holds", () => {
    expect(cursorAt(tv(TV_CUES.cursorIn - 0.01)).shown).toBe(0);
    const arrived = cursorAt(tv(TV_CUES.arrive));
    expect(Math.hypot(arrived.point.x - CURSOR_TARGET.x, arrived.point.y - CURSOR_TARGET.y)).toBeLessThan(3);
    expect(cursorAt(tv(TV_CUES.dwellDone)).fill).toBe(1);
    expect(cursorAt(tv(TV_CUES.dwellDone + 0.2)).swell).toBe(1);
  });

  it("moves the child's hand the way the cursor moves", () => {
    const before = handAt(tv(TV_CUES.travel));
    const after = handAt(tv(TV_CUES.arrive));
    expect(Math.sign(after.x - before.x)).toBe(Math.sign(CURSOR_TARGET.x - cursorAt(tv(TV_CUES.travel)).point.x));
  });

  it("tracks only while the hand is up, and bursts once the ring has filled", () => {
    expect(trackingAt(tv(0))).toBe(0);
    expect(trackingAt(tv(TV_CUES.arrive))).toBe(1);
    expect(trackingAt(tv(TV_CUES.cursorOut + 0.4))).toBe(0);
    expect(burstAt(tv(TV_CUES.dwellDone - 0.01))).toBe(0);
    expect(burstAt(tv(TV_CUES.dwellDone + 0.4))).toBeCloseTo(0.5);
  });
});
