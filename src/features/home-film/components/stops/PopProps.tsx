import { PALETTE } from "../../constants";
import type { BalloonState, PopState } from "../../logic/stops/pop";
import { Burst } from "../Burst";
import { mix } from "../colour";

/** One colour per balloon, in the order they appear. */
const COLOURS = [PALETTE.yellow, PALETTE.pink, PALETTE.blue, PALETTE.green];

function Balloon({ balloon, colour }: { balloon: BalloonState; colour: string }) {
  const { x, y, r, scale, tilt } = balloon;
  const ry = r * 1.18;
  const shade = mix(colour, "#16356B", 0.22);
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${scale.toFixed(4)})`}>
      <path
        d={`M 0 ${ry} q ${-r * 0.12} ${r * 0.5} ${r * 0.1} ${r * 0.9} t ${-r * 0.06} ${r * 0.9}`}
        fill="none"
        stroke="#7D8FB3"
        strokeWidth={r * 0.06}
        strokeLinecap="round"
      />
      <path d={`M ${-r * 0.13} ${ry + r * 0.16} L 0 ${ry - r * 0.04} L ${r * 0.13} ${ry + r * 0.16} Z`} fill={shade} />
      <ellipse rx={r} ry={ry} fill={colour} />
      {/* A darker crescent low on the right gives the balloon its round. */}
      <path d={`M ${r * 0.62} ${-ry * 0.62} A ${r} ${ry} 0 0 1 ${-r * 0.5} ${ry * 0.86} A ${r * 0.92} ${ry * 0.95} 0 0 0 ${r * 0.62} ${-ry * 0.62} Z`} fill={shade} opacity={0.35} />
      <ellipse cx={-r * 0.38} cy={-ry * 0.4} rx={r * 0.2} ry={r * 0.32} fill="#FFFFFF" opacity={0.55} transform={`rotate(24 ${-r * 0.38} ${-ry * 0.4})`} />
    </g>
  );
}

/** Balloons float behind the play; pops burst in front of everything. */
export function PopProps({ state, layer, size }: { state: PopState; layer: "back" | "front"; size: number }) {
  if (layer === "back") {
    return <g>{state.balloons.map((balloon, i) => balloon && <Balloon key={i} balloon={balloon} colour={COLOURS[i]} />)}</g>;
  }
  return (
    <g>
      {state.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} size={0.62 * size} />
      ))}
    </g>
  );
}
