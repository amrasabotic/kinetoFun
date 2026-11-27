import { FONTS, PALETTE } from "../../constants";
import type { LibraryState, Tile, TileIcon } from "../../logic/stops/library";
import { Burst } from "../Burst";
import { mix } from "../colour";
import { starPoints } from "./CatchProps";

/** Tile colours that keep a white icon readable. */
const TONES = [PALETTE.blue, PALETTE.pink, "#22B573", PALETTE.orange, PALETTE.purple, PALETTE.cursor];

/** Each icon drawn in white inside a 100 unit square centred on 0, 0. */
function Icon({ icon, tone }: { icon: TileIcon; tone: string }) {
  switch (icon) {
    case "ball":
      return (
        <g>
          <circle r={34} fill="#FFFFFF" />
          <path d="M -34 0 Q 0 -16 34 0 M -34 0 Q 0 16 34 0 M 0 -34 Q -16 0 0 34" fill="none" stroke={tone} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case "star":
      return <polygon points={starPoints(38)} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={8} strokeLinejoin="round" transform="translate(0 3)" />;
    case "note":
      return (
        <g fill="#FFFFFF">
          <ellipse cx={-12} cy={24} rx={16} ry={12} transform="rotate(-20 -12 24)" />
          <rect x={0} y={-34} width={8} height={58} rx={4} />
          <path d="M 4 -34 Q 30 -26 26 -2 Q 22 -16 4 -18 Z" />
        </g>
      );
    case "apple":
      return (
        <g fill="#FFFFFF">
          <path d="M 0 -18 C -30 -34 -46 -6 -36 16 C -28 36 -12 40 0 32 C 12 40 28 36 36 16 C 46 -6 30 -34 0 -18 Z" />
          <path d="M 2 -20 Q 6 -36 18 -40 Q 18 -26 2 -20 Z" />
        </g>
      );
    case "letter":
      return (
        <text y={4} textAnchor="middle" dominantBaseline="central" fontFamily={FONTS.display} fontWeight={800} fontSize={78} fill="#FFFFFF">
          A
        </text>
      );
    case "rocket":
      return (
        <g transform="rotate(35)">
          <path d="M 0 -42 C 18 -24 18 10 12 24 L -12 24 C -18 10 -18 -24 0 -42 Z" fill="#FFFFFF" />
          <circle cy={-10} r={7} fill={tone} />
          <path d="M -12 8 L -24 28 L -10 24 Z M 12 8 L 24 28 L 10 24 Z" fill="#FFFFFF" />
          <path d="M -7 28 Q 0 46 7 28 Z" fill={PALETTE.yellow} />
        </g>
      );
    case "balloon":
      return (
        <g>
          <path d="M 0 22 Q -6 32 2 40" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
          <ellipse cy={-6} rx={26} ry={30} fill="#FFFFFF" />
          <path d="M -5 26 L 0 20 L 5 26 Z" fill="#FFFFFF" />
        </g>
      );
    case "puzzle":
      return (
        <path
          d="M -30 -30 L -8 -30 A 9 9 0 1 1 8 -30 L 30 -30 L 30 -8 A 9 9 0 1 1 30 8 L 30 30 L -30 30 L -30 8 A 9 9 0 1 0 -30 -8 Z"
          fill="#FFFFFF"
        />
      );
  }
}

/** A game tile: a rounded square in its colour with a white icon, lifted and ringed while the hand is on it. */
function GameTile({ tile }: { tile: Tile }) {
  const { x, y, size: s, scale, opacity, icon, tone, hovered } = tile;
  const colour = TONES[tone];
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`} opacity={opacity}>
      {hovered > 0 && <rect x={-s / 2 - s * 0.09} y={-s / 2 - s * 0.09} width={s * 1.18} height={s * 1.18} rx={s * 0.3} fill="none" stroke="#FFFFFF" strokeWidth={s * 0.06} opacity={hovered} />}
      <rect x={-s / 2} y={-s / 2 + s * 0.06} width={s} height={s} rx={s * 0.24} fill={mix(colour, "#16356B", 0.28)} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.24} fill={colour} />
      <rect x={-s * 0.34} y={-s * 0.42} width={s * 0.68} height={s * 0.08} rx={s * 0.04} fill="#FFFFFF" opacity={0.3} />
      <g transform={`scale(${(s * 0.0058).toFixed(4)})`}>
        <Icon icon={icon} tone={colour} />
      </g>
    </g>
  );
}

/** The wall of games stands behind the mascot; the pick bursts in front. */
export function LibraryProps({ state, layer, size }: { state: LibraryState; layer: "back" | "front"; size: number }) {
  if (layer === "back") {
    // The tile under the hand is drawn last so it grows over its neighbours.
    const order = [...state.tiles].sort((a, b) => a.hovered - b.hovered);
    return (
      <g>
        {order.map((tile, i) => (
          <GameTile key={i} tile={tile} />
        ))}
      </g>
    );
  }
  return (
    <g>
      {state.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} size={0.6 * size} />
      ))}
    </g>
  );
}
