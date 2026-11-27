import { FONTS, PALETTE } from "../constants";
import type { FittedText } from "../logic/fit-text";
import { wordMotion, type LineCue } from "../logic/lines";
import type { TextBox } from "../types";

/** Line height of the display face, as a multiple of the font size. */
export const LINE_HEIGHT = 1.08;
/** Tracking of the display face, as a fraction of the font size. */
export const TRACKING = -0.012;
/** Space between words, as a fraction of the font size; words are set apart so each can move alone. */
export const WORD_GAP = 0.24;

// Room above and below each line so the mask that hides rising words never
// cuts the face's tall letters or descenders.
const MASK_PAD = { top: 0.12, bottom: 0.2 };

/**
 * Lines of big words that rise one by one out of a mask, hold, then leave
 * through the top. Accent lines are blue, the rest ink. Positioned on the
 * stage in stage px, at the size the words were fitted to.
 */
export function KineticLine({ text, box, cue, time }: { text: FittedText; box: TextBox; cue: LineCue; time: number }) {
  if (time < cue.enter || time > cue.exit + 1.5) return null;
  const { size, lines } = text;
  let wordIndex = 0;
  const lineBox = size * LINE_HEIGHT;
  const blockHeight = lineBox * lines.length;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y + (box.height - blockHeight) / 2,
        width: box.width,
        textAlign: box.align,
        fontFamily: FONTS.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: LINE_HEIGHT,
        letterSpacing: `${TRACKING}em`,
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          style={{
            overflow: "hidden",
            padding: `${MASK_PAD.top}em 0 ${MASK_PAD.bottom}em`,
            margin: `-${MASK_PAD.top}em 0 -${MASK_PAD.bottom}em`,
            color: line.accent ? PALETTE.blueText : PALETTE.ink,
          }}
        >
          {line.text.split(" ").map((word, i, words) => {
            const motion = wordMotion(time, cue, wordIndex++);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: i < words.length - 1 ? `${WORD_GAP}em` : 0,
                  transform: `translateY(${(motion.offset * (1 + MASK_PAD.top + MASK_PAD.bottom) * 100).toFixed(2)}%) rotate(${motion.tilt.toFixed(2)}deg)`,
                  transformOrigin: "0 100%",
                  visibility: motion.visible ? "visible" : "hidden",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
