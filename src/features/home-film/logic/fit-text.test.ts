import { describe, expect, it } from "vitest";
import { fitFontSize, fitText, wrapPhrase, type MeasureText } from "./fit-text";

/** Every character half an em wide: predictable widths for the tests. */
const measure: MeasureText = (text, size) => text.length * size * 0.5;

describe("fitFontSize", () => {
  it("keeps the largest size when everything fits", () => {
    expect(fitFontSize(["Pop!"], 100, 1000, 1000, 1, measure)).toBe(100);
  });

  it("shrinks to the widest line and to the height of all lines", () => {
    expect(fitFontSize(["abcdefghij"], 100, 250, 1000, 1, measure)).toBe(50);
    expect(fitFontSize(["a", "b", "c"], 100, 1000, 150, 1, measure)).toBe(50);
  });
});

describe("wrapPhrase", () => {
  it("fills each line before starting the next", () => {
    expect(wrapPhrase("Climb the leaderboard.", 10, 50, measure)).toEqual(["Climb the", "leaderboard."]);
  });

  it("keeps a word longer than the line on a line of its own", () => {
    expect(wrapPhrase("a leaderboard b", 10, 20, measure)).toEqual(["a", "leaderboard", "b"]);
  });
});

describe("fitText", () => {
  const box = { maxSize: 100, width: 600, height: 400 };

  it("keeps short phrases one to a line and marks the last one as the accent", () => {
    const fitted = fitText(["Point.", "Pop!"], box, 1, measure);
    expect(fitted.size).toBe(100);
    expect(fitted.lines).toEqual([
      { text: "Point.", accent: false },
      { text: "Pop!", accent: true },
    ]);
  });

  it("breaks a long phrase over lines when that sets the words markedly bigger", () => {
    const fitted = fitText(["Earn tickets.", "Climb the leaderboard."], box, 1, measure);
    expect(fitted.lines.map((line) => line.text)).toEqual(["Earn tickets.", "Climb the", "leaderboard."]);
    expect(fitted.lines.map((line) => line.accent)).toEqual([false, true, true]);
    expect(fitted.size).toBeGreaterThan(fitFontSize(["Earn tickets.", "Climb the leaderboard."], 100, 600, 400, 1, measure) * 1.25);
  });

  it("keeps one line per phrase when breaking would gain little", () => {
    const fitted = fitText(["Play.", "Learn the ABCs now"], { maxSize: 100, width: 840, height: 400 }, 1, measure);
    expect(fitted.lines).toHaveLength(2);
  });

  it("never uses more lines than allowed", () => {
    const fitted = fitText(["one two three four five six"], { maxSize: 200, width: 300, height: 2000 }, 1, measure, 2);
    expect(fitted.lines.length).toBeLessThanOrEqual(2);
  });

  it("does not mark a single phrase as the accent", () => {
    expect(fitText(["Play with a wave."], box, 1, measure).lines.every((line) => !line.accent)).toBe(true);
  });
});
