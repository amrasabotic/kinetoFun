import { PALETTE } from "../../constants";
import type { CatchState, FallingStar } from "../../logic/stops/catch";
import { Burst } from "../Burst";

/** A five-point star centred on 0, 0 with rounded points. */
export function starPoints(r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const radius = i % 2 === 0 ? r : r * 0.5;
    return `${(radius * Math.cos(a)).toFixed(2)},${(radius * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** A falling star with a short trail of sparkles above it. */
function Star({ star }: { star: FallingStar }) {
  const { x, y, r, angle, scale } = star;
  return (
    <g>
      {[1, 2, 3].map((i) => (
        <circle key={i} cx={x} cy={y - r * (0.9 + i * 0.75)} r={r * (0.26 - i * 0.06) * scale} fill={PALETTE.yellow} opacity={0.75 - i * 0.2} />
      ))}
      <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)}) scale(${scale.toFixed(4)})`}>
        <polygon points={starPoints(r)} fill={PALETTE.yellow} stroke="#FFB800" strokeWidth={r * 0.28} strokeLinejoin="round" />
        <polygon points={starPoints(r * 0.42)} fill="#FFFFFF" opacity={0.55} transform={`translate(${-r * 0.12} ${-r * 0.14})`} />
      </g>
    </g>
  );
}

/** Stars fall in front of the mascot and sparkle where its hands catch them. */
export function CatchProps({ state, size }: { state: CatchState; size: number }) {
  return (
    <g>
      {state.stars.map((star, i) => (
        <Star key={i} star={star} />
      ))}
      {state.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} size={0.42 * size} />
      ))}
    </g>
  );
}
