import { useId } from "react";
import { PALETTE } from "../constants";

// Proportions of the app's hand cursor (84 px box, 36 px ring, 4 px rim,
// 8 px progress, 7 px dot), so the film shows the pointer players really see.
const BOX = 84;
const RING = 36 / BOX;
const RIM = 4 / BOX;
const PROGRESS = 8 / BOX;
const DOT = 7 / BOX;

type CursorRingProps = {
  x: number;
  y: number;
  /** Width of the cursor's box, in the parent's units. */
  size: number;
  /** How full the hold-to-select ring is, 0 to 1. */
  fill: number;
  /** 0 hidden to 1 shown; it grows in as it appears. */
  shown: number;
  /** 0 to 1 as it selects: the ring swells a little, as it does in the app. */
  swell: number;
};

export function CursorRing({ x, y, size, fill, shown, swell }: CursorRingProps) {
  const shadowId = `kf-cursor-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (shown <= 0.001) return null;
  const r = size * RING;
  const circumference = 2 * Math.PI * r;
  const scale = (0.6 + 0.4 * shown) * (1 + 0.1 * swell);
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`} opacity={shown}>
      <defs>
        {/* Peaks on the ring itself, like a drop shadow of the ring rather than a disc. */}
        <radialGradient id={shadowId}>
          <stop offset="0.4" stopColor="#0A1B3D" stopOpacity={0} />
          <stop offset="0.63" stopColor="#0A1B3D" stopOpacity={0.45} />
          <stop offset="1" stopColor="#0A1B3D" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Soft shadow so the white ring reads on a bright screen. */}
      <circle r={size * 0.68} fill={`url(#${shadowId})`} />
      <circle r={r} fill="rgba(255,255,255,0.12)" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={size * RIM} />
      {fill > 0 && (
        <circle
          r={r}
          fill="none"
          stroke={PALETTE.cursor}
          strokeWidth={size * PROGRESS}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
          transform="rotate(-90)"
        />
      )}
      <circle r={size * DOT} fill="#FFFFFF" />
    </g>
  );
}
