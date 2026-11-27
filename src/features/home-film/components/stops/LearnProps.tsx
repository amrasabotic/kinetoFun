import { FONTS, PALETTE } from "../../constants";
import type { Block, LearnState } from "../../logic/stops/learn";
import { Burst } from "../Burst";
import { mix } from "../colour";

/** Deep enough tones that a white letter reads on each lit block. */
const TONES = [PALETTE.pink, PALETTE.blue, PALETTE.purple];

/** A toy block: pale with a coloured letter, filling with its colour as it lights. */
function LetterBlock({ block, tone }: { block: Block; tone: string }) {
  const { x, y, size: s, squash, lit, scale, letter } = block;
  const base = y + s / 2;
  const face = mix("#FFFFFF", tone, lit);
  const edge = mix(mix(tone, "#FFFFFF", 0.55), mix(tone, "#16356B", 0.3), lit);
  const ink = mix(tone, "#FFFFFF", lit);
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`}>
      <g transform={`translate(${x.toFixed(2)} ${base.toFixed(2)}) scale(${(1 + 0.6 * squash).toFixed(4)} ${(1 - squash).toFixed(4)}) translate(${(-x).toFixed(2)} ${(-base).toFixed(2)})`}>
        <rect x={x - s / 2} y={y - s / 2 + s * 0.08} width={s} height={s} rx={s * 0.2} fill={edge} />
        <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * 0.2} fill={face} stroke={edge} strokeWidth={s * 0.04 * (1 - lit)} />
        <rect x={x - s * 0.36} y={y - s * 0.42} width={s * 0.72} height={s * 0.1} rx={s * 0.05} fill="#FFFFFF" opacity={0.35 * lit} />
        <text
          x={x}
          y={y + s * 0.03}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONTS.display}
          fontWeight={800}
          fontSize={s * 0.66}
          fill={ink}
        >
          {letter}
        </text>
      </g>
    </g>
  );
}

/** Blocks stand beside the mascot; taps sparkle in front. */
export function LearnProps({ state, layer, size }: { state: LearnState; layer: "back" | "front"; size: number }) {
  if (layer === "back") {
    return (
      <g>
        {state.blocks.map((block, i) => (
          <LetterBlock key={block.letter} block={block} tone={TONES[i]} />
        ))}
      </g>
    );
  }
  return (
    <g>
      {state.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} size={0.5 * size} />
      ))}
    </g>
  );
}
