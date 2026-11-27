import { useId, type ReactNode } from "react";
import { ROOM } from "../constants";

const C = ROOM.colours;
const { tv, screen } = ROOM;
const TV_CENTRE = { x: tv.x + tv.width / 2, y: tv.y + tv.height / 2 };

// Far enough past every format's widest view that no edge of the room shows.
const EXTENT = { x: -600, y: -400, width: 3200, height: 2400 };
const SIDEBOARD = { x: 420, width: 1240, front: 812, bottom: 954 };

/** Floor seams run towards the TV, the room's vanishing point. */
const SEAMS = Array.from({ length: 19 }, (_, i) => i - 9);

/** A soft oval shadow drawn with a gradient, which stays cheap while the camera moves. */
function Shadow({ id, cx, cy, rx, ry, opacity }: { id: string; cx: number; cy: number; rx: number; ry: number; opacity: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} opacity={opacity} />;
}

function Plant() {
  const leaves = [
    { angle: -38, length: 210, width: 46, dark: true },
    { angle: 34, length: 200, width: 44, dark: true },
    { angle: -16, length: 250, width: 50, dark: false },
    { angle: 14, length: 236, width: 48, dark: false },
    { angle: -2, length: 196, width: 42, dark: true },
  ];
  const base = { x: 296, y: 884 };
  return (
    <g>
      {leaves.map((leaf, i) => (
        <g key={i} transform={`rotate(${leaf.angle} ${base.x} ${base.y})`}>
          <path
            d={`M ${base.x} ${base.y} C ${base.x - leaf.width} ${base.y - leaf.length * 0.35} ${base.x - leaf.width * 0.7} ${base.y - leaf.length * 0.85} ${base.x} ${base.y - leaf.length} C ${base.x + leaf.width * 0.7} ${base.y - leaf.length * 0.85} ${base.x + leaf.width} ${base.y - leaf.length * 0.35} ${base.x} ${base.y} Z`}
            fill={leaf.dark ? C.leafDark : C.leaf}
          />
          <path d={`M ${base.x} ${base.y - 8} L ${base.x} ${base.y - leaf.length * 0.86}`} stroke={C.leafDark} strokeWidth={3} strokeLinecap="round" opacity={leaf.dark ? 0 : 0.55} />
        </g>
      ))}
      <path d="M 238 876 L 354 876 L 340 984 Q 296 992 252 984 Z" fill={C.pot} />
      <rect x={230} y={866} width={132} height={22} rx={8} fill={C.pot} />
      <rect x={230} y={866} width={132} height={8} rx={4} fill="#FFFFFF" opacity={0.25} />
      <path d="M 252 900 L 340 900 L 337 922 L 255 922 Z" fill="#000000" opacity={0.08} />
    </g>
  );
}

function Sideboard() {
  const doors = 3;
  const inset = 18;
  const doorWidth = (SIDEBOARD.width - 40 - inset * (doors + 1)) / doors;
  const left = SIDEBOARD.x + 20;
  return (
    <g>
      {[0.08, 0.92].map((at) => (
        <path
          key={at}
          d={`M ${SIDEBOARD.x + SIDEBOARD.width * at - 14} ${SIDEBOARD.bottom} l 28 0 l -6 32 l -16 0 Z`}
          fill={C.woodShade}
        />
      ))}
      <rect x={left} y={SIDEBOARD.front} width={SIDEBOARD.width - 40} height={SIDEBOARD.bottom - SIDEBOARD.front} rx={6} fill={C.woodFront} />
      {Array.from({ length: doors }, (_, i) => {
        const x = left + inset + i * (doorWidth + inset);
        return (
          <g key={i}>
            <rect x={x} y={SIDEBOARD.front + 18} width={doorWidth} height={SIDEBOARD.bottom - SIDEBOARD.front - 36} rx={8} fill={C.wood} />
            <rect x={x} y={SIDEBOARD.bottom - 26} width={doorWidth} height={8} rx={4} fill={C.woodShade} opacity={0.45} />
            <rect x={x + doorWidth / 2 - 34} y={SIDEBOARD.front + 36} width={68} height={10} rx={5} fill={C.woodHandle} />
          </g>
        );
      })}
      <rect x={SIDEBOARD.x} y={ROOM.sideboardTop} width={SIDEBOARD.width} height={26} rx={8} fill={C.wood} />
      <rect x={SIDEBOARD.x} y={ROOM.sideboardTop + 18} width={SIDEBOARD.width} height={8} rx={4} fill={C.woodShade} opacity={0.6} />
      <rect x={SIDEBOARD.x + 6} y={ROOM.sideboardTop} width={SIDEBOARD.width - 12} height={5} rx={2.5} fill="#FFFFFF" opacity={0.5} />
    </g>
  );
}

/**
 * The living room in room units: wall, floor, sideboard, TV and a plant.
 * The TV screen's content comes in as `screen`, drawn in screen units with
 * the screen's top left corner at 0, 0. `glare` fades the reflection on the
 * glass in as the camera leaves the screen. `children` (the devices and the
 * child) are drawn over the room.
 */
export function Room({ screen: screenContent, glare, glow, children }: { screen: ReactNode; glare: number; glow: string; children?: ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    wall: `kfr-wall-${uid}`,
    floor: `kfr-floor-${uid}`,
    glow: `kfr-glow-${uid}`,
    shadow: `kfr-shadow-${uid}`,
    screen: `kfr-screen-${uid}`,
    glare: `kfr-glare-${uid}`,
  };

  return (
    <g>
      <defs>
        <linearGradient id={ids.wall} x1="0" y1="0" x2="0" y2={ROOM.floorTop} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.wallTop} />
          <stop offset="1" stopColor={C.wallBottom} />
        </linearGradient>
        <linearGradient id={ids.floor} x1="0" y1={ROOM.floorTop} x2="0" y2={ROOM.floorTop + 800} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.floorShade} />
          <stop offset="0.25" stopColor={C.floor} />
          <stop offset="1" stopColor={C.floor} />
        </linearGradient>
        <radialGradient id={ids.glow} cx={TV_CENTRE.x} cy={TV_CENTRE.y} r={900} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={glow} stopOpacity={0.9} />
          <stop offset="0.45" stopColor={glow} stopOpacity={0.35} />
          <stop offset="1" stopColor={glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={ids.shadow}>
          <stop offset="0" stopColor="#1B2A4A" stopOpacity={1} />
          <stop offset="1" stopColor="#1B2A4A" stopOpacity={0} />
        </radialGradient>
        <clipPath id={ids.screen}>
          <rect x={screen.x} y={screen.y} width={screen.width} height={screen.height} rx={screen.radius} />
        </clipPath>
        <linearGradient id={ids.glare} x1={screen.x} y1={screen.y} x2={screen.x + screen.width} y2={screen.y + screen.height} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
          <stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0.06} />
          <stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Wall, lit by the TV, with a skirting board. */}
      <rect x={EXTENT.x} y={EXTENT.y} width={EXTENT.width} height={ROOM.floorTop - EXTENT.y} fill={`url(#${ids.wall})`} />
      <rect x={EXTENT.x} y={EXTENT.y} width={EXTENT.width} height={ROOM.floorTop - EXTENT.y} fill={`url(#${ids.glow})`} />
      <rect x={EXTENT.x} y={ROOM.floorTop - 22} width={EXTENT.width} height={22} fill="#F6F9FE" />
      <rect x={EXTENT.x} y={ROOM.floorTop - 4} width={EXTENT.width} height={4} fill={C.woodShade} opacity={0.35} />

      {/* Floor with seams that run towards the TV, and a round rug. */}
      <rect x={EXTENT.x} y={ROOM.floorTop} width={EXTENT.width} height={EXTENT.y + EXTENT.height - ROOM.floorTop} fill={`url(#${ids.floor})`} />
      <g stroke={C.floorShade} strokeWidth={3} opacity={0.55}>
        {SEAMS.map((i) => (
          <line key={i} x1={TV_CENTRE.x + i * 150} y1={ROOM.floorTop} x2={TV_CENTRE.x + i * 150 * 3.4} y2={ROOM.floorTop + 1000} />
        ))}
      </g>
      <Shadow id={ids.shadow} cx={1040} cy={ROOM.floorTop + 4} rx={700} ry={26} opacity={0.22} />
      <ellipse cx={900} cy={1330} rx={660} ry={170} fill={C.rug} />
      <ellipse cx={900} cy={1330} rx={560} ry={132} fill="none" stroke="#FFFFFF" strokeWidth={10} opacity={0.6} />
      <ellipse cx={900} cy={1316} rx={660} ry={160} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.35} />

      <Plant />
      <Shadow id={ids.shadow} cx={296} cy={986} rx={86} ry={12} opacity={0.3} />

      {/* Shadow cast on the wall by the TV, then the stand, bezel and screen. */}
      <rect x={tv.x + 16} y={tv.y + 28} width={tv.width - 8} height={tv.height} rx={tv.radius + 10} fill="#1B2A4A" opacity={0.08} />
      <Sideboard />
      <rect x={TV_CENTRE.x - 22} y={tv.y + tv.height - 4} width={44} height={34} fill={C.tvBezel} />
      <rect x={TV_CENTRE.x - 110} y={ROOM.sideboardTop - 14} width={220} height={16} rx={8} fill={C.tvBezel} />
      <rect x={tv.x} y={tv.y} width={tv.width} height={tv.height} rx={tv.radius} fill={C.tvBezel} />
      <rect x={tv.x + 6} y={tv.y + 2} width={tv.width - 12} height={3} rx={1.5} fill={C.tvBezelEdge} />
      <g clipPath={`url(#${ids.screen})`}>
        <g transform={`translate(${screen.x} ${screen.y})`}>{screenContent}</g>
        {glare > 0 && <rect x={screen.x} y={screen.y} width={screen.width} height={screen.height} fill={`url(#${ids.glare})`} opacity={glare} />}
      </g>

      {children}
    </g>
  );
}
