import { KID, PALETTE, ROOM } from "../constants";
import { ARM, handAt, handWaveAt, reach } from "../logic/hand-path";
import type { Point } from "../types";

/** The child in front of the TV, seen from behind, in room units. */
const HEAD = { x: 752, y: 930, r: 62 };
const LEFT_ARM = { shoulder: { x: 678, y: 1030 }, elbow: { x: 654, y: 1122 }, hand: { x: 648, y: 1206 } };
const ARM_WIDTH = 34;
const SLEEVE_WIDTH = 46;
/** How much of the upper arm the T-shirt sleeve covers. */
const SLEEVE_SHARE = 0.55;
/** From the wrist to the middle of the palm. */
const PALM_REACH = 26;

const SHIRT =
  "M 716 994 Q 752 1004 788 994 C 812 998 830 1006 840 1028 L 858 1238 Q 752 1254 646 1238 L 664 1028 C 674 1006 692 998 716 994 Z";
const JEANS = "M 654 1232 L 850 1232 L 846 1500 L 768 1500 L 756 1306 L 748 1306 L 736 1500 L 658 1500 Z";
/** The back of the head is all hair: a round shape with a soft nape and a tuft on the crown. */
const HAIR = `M ${HEAD.x - 60} ${HEAD.y + 10} C ${HEAD.x - 66} ${HEAD.y - 40} ${HEAD.x - 34} ${HEAD.y - 66} ${HEAD.x - 2} ${HEAD.y - 64} C ${HEAD.x + 10} ${HEAD.y - 84} ${HEAD.x + 34} ${HEAD.y - 82} ${HEAD.x + 28} ${HEAD.y - 62} C ${HEAD.x + 56} ${HEAD.y - 52} ${HEAD.x + 66} ${HEAD.y - 24} ${HEAD.x + 60} ${HEAD.y + 12} C ${HEAD.x + 56} ${HEAD.y + 40} ${HEAD.x + 36} ${HEAD.y + 58} ${HEAD.x + 16} ${HEAD.y + 54} Q ${HEAD.x} ${HEAD.y + 64} ${HEAD.x - 16} ${HEAD.y + 54} C ${HEAD.x - 38} ${HEAD.y + 58} ${HEAD.x - 56} ${HEAD.y + 40} ${HEAD.x - 60} ${HEAD.y + 10} Z`;

type Arm = { shoulder: Point; elbow: Point; hand: Point };

/** A small open hand, wrist at 0, 0 and fingers pointing up: a round palm, four short fingers and a thumb. */
function Hand({ at, angle, fill }: { at: Point; angle: number; fill: string }) {
  return (
    <g transform={`translate(${at.x.toFixed(2)} ${at.y.toFixed(2)}) rotate(${angle.toFixed(2)})`}>
      <g stroke={fill} strokeWidth={10.5} strokeLinecap="round">
        <line x1={-12} y1={-30} x2={-15} y2={-48} />
        <line x1={-4} y1={-34} x2={-4} y2={-55} />
        <line x1={5} y1={-34} x2={6} y2={-54} />
        <line x1={13} y1={-30} x2={16} y2={-46} />
        <line x1={17} y1={-14} x2={29} y2={-27} />
      </g>
      <ellipse cx={0} cy={-22} rx={19} ry={20} fill={fill} />
    </g>
  );
}

/** An arm with the T-shirt sleeve over the top of the upper arm. */
function SleevedArm({ arm, handAngle }: { arm: Arm; handAngle: number }) {
  const sleeveEnd = {
    x: arm.shoulder.x + (arm.elbow.x - arm.shoulder.x) * SLEEVE_SHARE,
    y: arm.shoulder.y + (arm.elbow.y - arm.shoulder.y) * SLEEVE_SHARE,
  };
  return (
    <g strokeLinecap="round">
      <line x1={arm.shoulder.x} y1={arm.shoulder.y} x2={arm.elbow.x} y2={arm.elbow.y} stroke={KID.skin} strokeWidth={ARM_WIDTH} />
      <line x1={arm.elbow.x} y1={arm.elbow.y} x2={arm.hand.x} y2={arm.hand.y} stroke={KID.skin} strokeWidth={ARM_WIDTH - 2} />
      <Hand at={arm.hand} angle={handAngle} fill={KID.skin} />
      <line x1={arm.shoulder.x} y1={arm.shoulder.y} x2={sleeveEnd.x} y2={sleeveEnd.y} stroke={KID.shirt} strokeWidth={SLEEVE_WIDTH} />
    </g>
  );
}

/** Degrees that turn the hand's fingers from straight up to along the forearm. */
const alongForearm = (arm: Arm) => (Math.atan2(arm.hand.y - arm.elbow.y, arm.hand.x - arm.elbow.x) * 180) / Math.PI + 90;

/** Corner brackets around the open hand while the camera tracks it. */
function TrackingFrame({ arm, angle, tracking }: { arm: Arm; angle: number; tracking: number }) {
  if (tracking <= 0.001) return null;
  const direction = ((angle - 90) * Math.PI) / 180;
  const centre = { x: arm.hand.x + Math.cos(direction) * PALM_REACH, y: arm.hand.y + Math.sin(direction) * PALM_REACH };
  const half = 52 * (1.3 - 0.3 * tracking);
  const leg = 18;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const;
  return (
    <g fill="none" stroke={PALETTE.cursor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={tracking}>
      {corners.map(([sx, sy]) => {
        const x = centre.x + sx * half;
        const y = centre.y + sy * half;
        return <path key={`${sx}${sy}`} d={`M ${x} ${y - sy * leg} L ${x} ${y} L ${x - sx * leg} ${y}`} />;
      })}
    </g>
  );
}

/**
 * The child in front of the TV, seen from behind so no face ever shows:
 * hair, a T-shirt and jeans, raising a hand to wave at the screen.
 */
export function Child({ time, tracking }: { time: number; tracking: number }) {
  const raised = { shoulder: ARM.shoulder, ...reach(ARM.shoulder, handAt(time), ARM.upper, ARM.fore) };
  const raisedAngle = alongForearm(raised) + handWaveAt(time);
  return (
    <g>
      <ellipse cx={HEAD.x} cy={1512} rx={140} ry={16} fill="#1B2A4A" opacity={0.16} />

      {/* Legs, shoes and T-shirt, with the screen's light along the top edges. */}
      <path d={JEANS} fill={KID.jeans} />
      <path d="M 752 1240 L 756 1306 L 768 1500 L 846 1500 L 850 1240 Z" fill={KID.jeansShade} opacity={0.35} />
      <ellipse cx={697} cy={1504} rx={46} ry={17} fill={KID.sole} />
      <ellipse cx={807} cy={1504} rx={46} ry={17} fill={KID.sole} />
      <ellipse cx={697} cy={1498} rx={44} ry={15} fill={KID.shoe} />
      <ellipse cx={807} cy={1498} rx={44} ry={15} fill={KID.shoe} />
      <SleevedArm arm={LEFT_ARM} handAngle={alongForearm(LEFT_ARM)} />
      <path d={SHIRT} fill={KID.shirt} />
      <path d="M 646 1238 Q 752 1254 858 1238 L 852 1170 Q 752 1188 652 1170 Z" fill={KID.shirtShade} opacity={0.55} />
      <path d="M 664 1028 C 674 1006 692 998 716 994 Q 752 1004 788 994 C 812 998 830 1006 840 1028" fill="none" stroke={ROOM.colours.rim} strokeWidth={4} strokeLinecap="round" opacity={0.55} />

      {/* Neck, ears and hair. */}
      <rect x={HEAD.x - 20} y={HEAD.y + 36} width={40} height={36} rx={14} fill={KID.skinShade} />
      <ellipse cx={HEAD.x - HEAD.r + 2} cy={HEAD.y + 10} rx={12} ry={16} fill={KID.skin} />
      <ellipse cx={HEAD.x + HEAD.r - 2} cy={HEAD.y + 10} rx={12} ry={16} fill={KID.skin} />
      <path d={HAIR} fill={KID.hair} />
      <path
        d={`M ${HEAD.x - 44} ${HEAD.y - 34} Q ${HEAD.x - 6} ${HEAD.y - 70} ${HEAD.x + 40} ${HEAD.y - 40}`}
        fill="none"
        stroke={KID.hairLight}
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.8}
      />

      <SleevedArm arm={raised} handAngle={raisedAngle} />
      <TrackingFrame arm={raised} angle={raisedAngle} tracking={tracking} />
    </g>
  );
}
