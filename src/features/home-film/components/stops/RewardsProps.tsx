import { FONTS, PALETTE } from "../../constants";
import type { Bar, RewardsState, Ticket } from "../../logic/stops/rewards";
import { Burst } from "../Burst";
import { mix } from "../colour";

/** Gold, silver and bronze, by place. */
const PLACE_COLOURS: Record<number, string> = { 1: "#FFC93C", 2: "#C9D8EE", 3: "#FF9F5A" };

function PodiumBar({ bar, ground }: { bar: Bar; ground: number }) {
  const { x, width: w, height: h, place } = bar;
  if (h <= 0.5) return null;
  const colour = PLACE_COLOURS[place];
  const r = Math.min(w * 0.12, h);
  const top = ground - h;
  const label = w * 0.44;
  return (
    <g>
      <path d={`M ${x - w / 2} ${ground} L ${x - w / 2} ${top + r} Q ${x - w / 2} ${top} ${x - w / 2 + r} ${top} L ${x + w / 2 - r} ${top} Q ${x + w / 2} ${top} ${x + w / 2} ${top + r} L ${x + w / 2} ${ground} Z`} fill={colour} />
      <rect x={x - w / 2} y={top} width={w} height={Math.min(h, w * 0.1)} rx={Math.min(r, w * 0.05)} fill="#FFFFFF" opacity={0.4} />
      <rect x={x + w * 0.22} y={top + w * 0.1} width={w * 0.28} height={Math.max(0, h - w * 0.1)} fill={mix(colour, "#16356B", 0.15)} opacity={0.35} />
      {h > label * 1.2 && (
        <text x={x} y={top + label * 0.95} textAnchor="middle" dominantBaseline="central" fontFamily={FONTS.display} fontWeight={800} fontSize={label} fill={PALETTE.ink} opacity={0.82}>
          {place}
        </text>
      )}
    </g>
  );
}

/** A ticket stub, centred on 0, 0: notched at the sides, with a dashed tear line and a star. */
function TicketShape({ size }: { size: number }) {
  const w = size;
  const h = size * 0.58;
  const notch = h * 0.2;
  return (
    <g>
      <path
        d={`M ${-w / 2} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${-notch} A ${notch} ${notch} 0 0 0 ${w / 2} ${notch} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} L ${-w / 2} ${notch} A ${notch} ${notch} 0 0 0 ${-w / 2} ${-notch} Z`}
        fill={PALETTE.pink}
        stroke={PALETTE.pink}
        strokeWidth={size * 0.08}
        strokeLinejoin="round"
      />
      <line x1={w * 0.16} y1={-h * 0.36} x2={w * 0.16} y2={h * 0.36} stroke="#FFFFFF" strokeWidth={size * 0.05} strokeDasharray={`${size * 0.08} ${size * 0.07}`} opacity={0.8} />
      <circle cx={-w * 0.12} cy={0} r={h * 0.22} fill="#FFFFFF" />
    </g>
  );
}

function FlyingTicket({ ticket, size }: { ticket: Ticket; size: number }) {
  return (
    <g transform={`translate(${ticket.x.toFixed(2)} ${ticket.y.toFixed(2)}) rotate(${ticket.angle.toFixed(1)}) scale(${ticket.scale.toFixed(3)})`}>
      <TicketShape size={size} />
    </g>
  );
}

/** The ticket counter: a white pill with a ticket and the total, swelling as each ticket lands. */
function Counter({ counter }: { counter: RewardsState["counter"] }) {
  if (counter.shown <= 0.001) return null;
  const k = counter.scale;
  const w = 132 * k;
  const h = 48 * k;
  return (
    <g transform={`translate(${counter.x.toFixed(2)} ${counter.y.toFixed(2)}) scale(${(1 + 0.12 * counter.pulse).toFixed(4)})`} opacity={counter.shown}>
      <rect x={-w / 2} y={-h / 2 + 3 * k} width={w} height={h} rx={h / 2} fill="#16356B" opacity={0.12} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill="#FFFFFF" />
      <g transform={`translate(${-w / 2 + h * 0.62} 0) rotate(-12)`}>
        <TicketShape size={h * 0.66} />
      </g>
      <text x={w * 0.12} y={1 * k} textAnchor="middle" dominantBaseline="central" fontFamily={FONTS.display} fontWeight={800} fontSize={h * 0.62} fill={PALETTE.ink}>
        {counter.value}
      </text>
    </g>
  );
}

/** The podium stands behind the mascot; tickets, the counter and the winner's confetti are in front. */
export function RewardsProps({ state, layer, size, ground }: { state: RewardsState; layer: "back" | "front"; size: number; ground: number }) {
  if (layer === "back") {
    return (
      <g>
        {state.bars.map((bar) => (
          <PodiumBar key={bar.place} bar={bar} ground={ground} />
        ))}
      </g>
    );
  }
  return (
    <g>
      {state.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} size={0.85 * size} />
      ))}
      {state.tickets.map((ticket, i) => (
        <FlyingTicket key={i} ticket={ticket} size={36 * size} />
      ))}
      <Counter counter={state.counter} />
    </g>
  );
}
