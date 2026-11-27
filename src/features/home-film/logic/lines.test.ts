import { describe, expect, it } from "vitest";
import { COPY } from "../constants";
import { LINE_BOXES, LINE_CUES, LINE_KEYS, wordMotion } from "./lines";
import { FILM_LENGTH } from "./timeline";

/** Seconds a word takes to rise into place, and to leave. */
const ENTER = 0.65;
const EXIT = 0.32;

const wordCount = (phrases: readonly string[]) => phrases.join(" ").split(" ").length;

describe("line cues", () => {
  it("gives every set of words in the copy a cue and a box", () => {
    for (const copy of Object.values(COPY)) expect(new Set(LINE_KEYS)).toEqual(new Set(Object.keys(copy.lines)));
    for (const key of LINE_KEYS) expect(LINE_BOXES[key]).toBeDefined();
  });

  it("holds every set of words fully in place for at least 1.2 seconds, in every language", () => {
    for (const [language, copy] of Object.entries(COPY)) {
      for (const key of LINE_KEYS) {
        const allIn = LINE_CUES[key].enter + (wordCount(copy.lines[key]) - 1) * 0.07 + ENTER;
        expect(LINE_CUES[key].exit - allIn, `${language} ${key}`).toBeGreaterThanOrEqual(1.2);
      }
    }
  });

  it("never shows two sets of words in the same box at once, in any language", () => {
    for (const [language, copy] of Object.entries(COPY)) {
      for (const a of LINE_KEYS) {
        for (const b of LINE_KEYS) {
          if (a === b || LINE_BOXES[a] !== LINE_BOXES[b] || LINE_CUES[a].enter > LINE_CUES[b].enter) continue;
          const gone = LINE_CUES[a].exit + (wordCount(copy.lines[a]) - 1) * 0.035 + EXIT;
          expect(gone, `${language} ${a} then ${b}`).toBeLessThanOrEqual(LINE_CUES[b].enter);
        }
      }
    }
  });

  it("shows no words at the loop's seam", () => {
    for (const key of LINE_KEYS) {
      for (let i = 0; i < 8; i++) {
        expect(wordMotion(0, LINE_CUES[key], i).visible).toBe(false);
        expect(wordMotion(FILM_LENGTH - 1e-6, LINE_CUES[key], i).visible).toBe(false);
      }
    }
  });
});

describe("wordMotion", () => {
  const cue = { enter: 1, exit: 3 };

  it("rises a word out of the mask, holds it, and lifts it out through the top", () => {
    expect(wordMotion(0.9, cue, 0)).toMatchObject({ offset: 1, visible: false });
    expect(wordMotion(2, cue, 0)).toMatchObject({ offset: 0, tilt: 0, visible: true });
    expect(wordMotion(4, cue, 0)).toMatchObject({ offset: -1, visible: false });
  });

  it("staggers later words", () => {
    expect(wordMotion(1.2, cue, 3).offset).toBeGreaterThan(wordMotion(1.2, cue, 0).offset);
  });
});
