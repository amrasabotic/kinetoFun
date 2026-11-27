/** Measures the width of `text` set at `size` px. */
export type MeasureText = (text: string, size: number) => number;

/**
 * The largest whole font size, up to `maxSize`, at which every line fits
 * `maxWidth` and the lines together fit `maxHeight`. A translation that runs
 * longer gets a smaller size instead of breaking out of its box.
 */
export function fitFontSize(
  lines: readonly string[],
  maxSize: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number,
  measure: MeasureText,
) {
  let size = maxSize;
  for (const line of lines) {
    const width = measure(line, maxSize);
    if (width > maxWidth) size = Math.min(size, (maxSize * maxWidth) / width);
  }
  if (lines.length > 0) size = Math.min(size, maxHeight / (lines.length * lineHeight));
  return Math.max(1, Math.floor(size));
}

/** Words onto lines no wider than `maxWidth` at `size`, filling each line before starting the next. */
export function wrapPhrase(phrase: string, size: number, maxWidth: number, measure: MeasureText) {
  const lines: string[] = [];
  let current = "";
  for (const word of phrase.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (current && measure(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** A line of a fitted set of words; `accent` lines come from the last phrase and are set in blue. */
export type FittedLine = { text: string; accent: boolean };
export type FittedText = { size: number; lines: FittedLine[] };

/** A phrase is only broken over lines when that sets the words at least this much bigger. */
const WRAP_GAIN = 1.25;

/**
 * Fits phrases into a box. Each phrase keeps to one line unless breaking
 * phrases over more lines (up to `maxLines`) sets the words markedly
 * bigger, so a long translation stays large instead of shrinking to fit
 * one line. The last phrase is the accent when there is more than one.
 */
export function fitText(
  phrases: readonly string[],
  box: { maxSize: number; width: number; height: number },
  lineHeight: number,
  measure: MeasureText,
  maxLines = 3,
): FittedText {
  const accentFrom = phrases.length > 1 ? phrases.length - 1 : phrases.length;
  const asLines = (split: (phrase: string) => string[]) =>
    phrases.flatMap((phrase, i) => split(phrase).map((text) => ({ text, accent: i >= accentFrom })));
  const single = fitFontSize(phrases, box.maxSize, box.width, box.height, lineHeight, measure);
  for (let size = box.maxSize; size >= single * WRAP_GAIN; size--) {
    const lines = asLines((phrase) => wrapPhrase(phrase, size, box.width, measure));
    const fits =
      lines.length <= maxLines &&
      lines.length * lineHeight * size <= box.height &&
      lines.every((line) => measure(line.text, size) <= box.width);
    if (fits) return { size, lines };
  }
  return { size: single, lines: asLines((phrase) => [phrase]) };
}
