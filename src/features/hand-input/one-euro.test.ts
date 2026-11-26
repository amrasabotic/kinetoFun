import { describe, expect, it } from "vitest";
import { OneEuroFilter } from "./one-euro";

describe("OneEuroFilter", () => {
  it("passes the first sample through unchanged", () => {
    const filter = new OneEuroFilter(1.2, 0.004);
    expect(filter.filter(420, 1000)).toBe(420);
  });

  it("keeps a constant input constant", () => {
    const filter = new OneEuroFilter(1.2, 0.004);
    let out = 0;
    for (let i = 0; i < 60; i++) out = filter.filter(300, 1000 + i * 33);
    expect(out).toBeCloseTo(300, 9);
  });

  it("passes the next sample through unchanged after reset", () => {
    const filter = new OneEuroFilter(1.2, 0.004);
    filter.filter(100, 1000);
    filter.filter(900, 1033);
    filter.reset();
    expect(filter.filter(555, 5000)).toBe(555);
  });
});
