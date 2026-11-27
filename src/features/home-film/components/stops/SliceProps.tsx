import type { FruitHalf, FruitKind, SliceState, WholeFruit } from "../../logic/stops/slice";
import type { Point } from "../../types";

/** Each fruit's skin, the flesh its cut shows, a thin ring between them, and its juice. */
const FRUIT: Record<FruitKind, { skin: string; skinShade: string; ring: string; flesh: string; juice: string }> = {
  melon: { skin: "#3DBB5A", skinShade: "#23853D", ring: "#E9F7D9", flesh: "#FF5A72", juice: "#FF6F85" },
  orange: { skin: "#FF9A1F", skinShade: "#E57A00", ring: "#FFE2A6", flesh: "#FFB938", juice: "#FFB13B" },
  apple: { skin: "#F2434F", skinShade: "#C92A37", ring: "#FFF6DE", flesh: "#FFEFC2", juice: "#FFE38A" },
};

function Whole({ fruit }: { fruit: WholeFruit }) {
  const { kind, x, y, r, angle } = fruit;
  const c = FRUIT[kind];
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})`}>
      <circle r={r} fill={c.skin} />
      {kind === "melon" && (
        <g fill="none" stroke={c.skinShade} strokeWidth={r * 0.16} strokeLinecap="round">
          <path d={`M ${-r * 0.5} ${-r * 0.8} Q ${-r * 0.75} 0 ${-r * 0.5} ${r * 0.8}`} />
          <path d={`M 0 ${-r * 0.95} Q ${-r * 0.2} 0 0 ${r * 0.95}`} />
          <path d={`M ${r * 0.5} ${-r * 0.8} Q ${r * 0.3} 0 ${r * 0.5} ${r * 0.8}`} />
        </g>
      )}
      {kind === "orange" && (
        <g fill={c.skinShade} opacity={0.5}>
          <circle cx={r * 0.3} cy={r * 0.2} r={r * 0.06} />
          <circle cx={-r * 0.2} cy={r * 0.4} r={r * 0.06} />
          <circle cx={r * 0.05} cy={-r * 0.25} r={r * 0.06} />
        </g>
      )}
      {kind !== "melon" && (
        <g>
          <path d={`M 0 ${-r * 0.86} L ${r * 0.06} ${-r * 1.22}`} stroke="#6B4A2B" strokeWidth={r * 0.1} strokeLinecap="round" />
          <path d={`M ${r * 0.06} ${-r * 1.02} q ${r * 0.34} ${-r * 0.34} ${r * 0.6} ${-r * 0.1} q ${-r * 0.3} ${r * 0.28} ${-r * 0.6} ${r * 0.1} Z`} fill="#4CC46E" />
        </g>
      )}
      <path d={`M ${r * 0.72} ${-r * 0.5} A ${r} ${r} 0 0 1 ${-r * 0.5} ${r * 0.86} A ${r * 0.9} ${r * 0.9} 0 0 0 ${r * 0.72} ${-r * 0.5} Z`} fill={c.skinShade} opacity={0.3} />
      <ellipse cx={-r * 0.38} cy={-r * 0.42} rx={r * 0.18} ry={r * 0.28} fill="#FFFFFF" opacity={0.5} transform={`rotate(36 ${-r * 0.38} ${-r * 0.42})`} />
    </g>
  );
}

/** A half with its cut face towards the viewer: skin, a pale ring, then the flesh. */
function Half({ half }: { half: FruitHalf }) {
  const { kind, x, y, r, angle, opacity } = half;
  if (opacity <= 0) return null;
  const c = FRUIT[kind];
  const semi = (radius: number) => `M ${-radius} 0 A ${radius} ${radius} 0 0 0 ${radius} 0 Z`;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})`} opacity={opacity}>
      <path d={semi(r)} fill={c.skin} />
      <path d={semi(r * 0.86)} fill={c.ring} />
      <path d={semi(r * 0.76)} fill={c.flesh} />
      {kind === "melon" && (
        <g fill="#2B1B1E">
          <ellipse cx={-r * 0.32} cy={r * 0.3} rx={r * 0.05} ry={r * 0.09} />
          <ellipse cx={0} cy={r * 0.45} rx={r * 0.05} ry={r * 0.09} />
          <ellipse cx={r * 0.32} cy={r * 0.3} rx={r * 0.05} ry={r * 0.09} />
        </g>
      )}
      {kind === "orange" && (
        <g stroke={c.ring} strokeWidth={r * 0.06} strokeLinecap="round">
          {[30, 70, 110, 150].map((a) => (
            <line key={a} x1={0} y1={0} x2={Math.cos((a * Math.PI) / 180) * r * 0.7} y2={Math.sin((a * Math.PI) / 180) * r * 0.7} />
          ))}
        </g>
      )}
      {kind === "apple" && (
        <g fill="#6B4A2B">
          <ellipse cx={-r * 0.14} cy={r * 0.28} rx={r * 0.05} ry={r * 0.09} transform={`rotate(-20 ${-r * 0.14} ${r * 0.28})`} />
          <ellipse cx={r * 0.14} cy={r * 0.28} rx={r * 0.05} ry={r * 0.09} transform={`rotate(20 ${r * 0.14} ${r * 0.28})`} />
        </g>
      )}
    </g>
  );
}

/** The blade's trail: a tapered sweep from a point at its tail to its full width at the hand. */
function Trail({ points, width }: { points: Point[]; width: number }) {
  if (points.length < 2) return null;
  const head = points[points.length - 1];
  const tail = points[0];
  if (Math.hypot(head.x - tail.x, head.y - tail.y) < width) return null;
  const left: string[] = [];
  const right: string[] = [];
  points.forEach((p, i) => {
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const w = (width * i) / (points.length - 1);
    left.push(`${(p.x - (dy / length) * w).toFixed(1)},${(p.y + (dx / length) * w).toFixed(1)}`);
    right.unshift(`${(p.x + (dy / length) * w).toFixed(1)},${(p.y - (dx / length) * w).toFixed(1)}`);
  });
  return (
    <g>
      <polygon points={[...left, ...right].join(" ")} fill="#FFFFFF" opacity={0.92} />
      <polyline points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke="#9FE3FF" strokeWidth={width * 0.35} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

/** Fruit flies in front of the mascot; the blade's trail sweeps over it. */
export function SliceProps({ state, size }: { state: SliceState; size: number }) {
  return (
    <g>
      {state.juice.map((drop, i) => (
        <circle key={`j${i}`} cx={drop.x} cy={drop.y} r={drop.r} fill={FRUIT[drop.kind].juice} opacity={drop.opacity} />
      ))}
      {state.halves.map((half, i) => (
        <Half key={`h${i}`} half={half} />
      ))}
      {state.whole.map((fruit, i) => (
        <Whole key={`w${i}`} fruit={fruit} />
      ))}
      <Trail points={state.trail} width={13 * size} />
    </g>
  );
}
