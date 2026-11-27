import { FONTS } from "../constants";
import { fitText, type FittedText, type MeasureText } from "../logic/fit-text";
import { LINE_BOXES, LINE_KEYS } from "../logic/lines";
import type { FilmCopy, FilmFormat, LineKey } from "../types";
import { LINE_HEIGHT, TRACKING, WORD_GAP } from "./KineticLine";

/** Each set of words broken into lines and sized to its box, in stage px. */
export type FittedLines = Record<LineKey, FittedText>;

/** Measures a line the way `KineticLine` sets it: words with a fixed gap, and the face's tracking. */
function canvasMeasure(context: CanvasRenderingContext2D): MeasureText {
  return (text, size) => {
    context.font = `800 ${size}px ${FONTS.display}`;
    const words = text.split(" ");
    const letters = words.join("").length;
    const wordWidths = words.reduce((sum, word) => sum + context.measureText(word).width, 0);
    return wordWidths + (words.length - 1) * WORD_GAP * size + letters * TRACKING * size;
  };
}

/** How each set of words is set on `format`, measured in the browser once the face has loaded. */
export function fitLines(format: FilmFormat, copy: FilmCopy): FittedLines {
  const context = document.createElement("canvas").getContext("2d");
  // Without a canvas the words keep one phrase per line, measured as if each letter were half an em.
  const measure: MeasureText = context ? canvasMeasure(context) : (text, size) => text.length * size * 0.5;
  const fit = (key: LineKey) => fitText(copy.lines[key], format[LINE_BOXES[key]], LINE_HEIGHT, measure);
  return Object.fromEntries(LINE_KEYS.map((key) => [key, fit(key)])) as FittedLines;
}
