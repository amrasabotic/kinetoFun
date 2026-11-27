import { PALETTE } from "../constants";
import { ease, lerp } from "../logic/motion";
import type { BurstState } from "../types";

/** Pieces thrown out by a burst: angle in degrees, distance, size and colour, for a burst of size 1. */
const PIECES = [
  { angle: -90, distance: 118, size: 11, colour: PALETTE.yellow },
  { angle: -52, distance: 132, size: 9, colour: PALETTE.pink },
  { angle: -14, distance: 120, size: 12, colour: PALETTE.green },
  { angle: 24, distance: 128, size: 8, colour: PALETTE.purple },
  { angle: 62, distance: 110, size: 10, colour: PALETTE.orange },
  { angle: 118, distance: 116, size: 9, colour: PALETTE.blue },
  { angle: 156, distance: 130, size: 11, colour: PALETTE.yellow },
  { angle: 194, distance: 122, size: 8, colour: PALETTE.pink },
  { angle: 232, distance: 128, size: 10, colour: PALETTE.green },
];

/** A ring and confetti thrown out from a point, then falling and fading. `size` scales the whole burst. */
export function Burst({ burst, size = 1 }: { burst: BurstState; size?: number }) {
  const { amount, at } = burst;
  if (amount <= 0 || amount >= 1) return null;
  const travel = ease.enter(amount);
  const fade = 1 - ease.leave(Math.max(0, (amount - 0.45) / 0.55));
  return (
    <g>
      <circle
        cx={at.x}
        cy={at.y}
        r={lerp(30, 120, travel) * size}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={lerp(10, 1, travel) * size}
        opacity={0.9 * (1 - amount)}
      />
      {PIECES.map((piece, i) => {
        const a = (piece.angle * Math.PI) / 180;
        const x = at.x + Math.cos(a) * piece.distance * travel * size;
        const y = at.y + (Math.sin(a) * piece.distance * travel + 30 * amount * amount) * size;
        const s = piece.size * size;
        return i % 3 === 0 ? (
          <rect
            key={i}
            x={x - s}
            y={y - s / 2.5}
            width={s * 2}
            height={s / 1.25}
            rx={s / 2.5}
            fill={piece.colour}
            opacity={fade}
            transform={`rotate(${piece.angle + 400 * amount} ${x} ${y})`}
          />
        ) : (
          <circle key={i} cx={x} cy={y} r={s * (1 - 0.4 * amount)} fill={piece.colour} opacity={fade} />
        );
      })}
    </g>
  );
}
