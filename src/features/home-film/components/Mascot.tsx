import { useId } from "react";
import { MASCOT } from "../constants";
import type { MascotPose } from "../types";

// Drawn in the coordinate space of public/logo.png (1254 px square), so the
// parts can be checked against the logo one to one. The view box crops the
// mascot and its decoration out of the full lockup.
const VIEW_BOX = "20 350 600 560";

const WRIST = { x: 212, y: 728 };
const ANTENNA_BASE = { x: 402, y: 488 };
const ANTENNA_BALL = { x: 402, y: 450 };
const FACE_CENTRE_X = 381;
const BASE_Y = 798;
/** The second hand is the logo hand mirrored across the middle of the TV. */
const MIRROR = `translate(${FACE_CENTRE_X * 2} 0) scale(-1 1)`;

// Measured from the logo: the TV leans slightly right, its screen has an
// arched top and a rounded bottom, and it stands on two short feet.
const BODY_PATH =
  "M 210 560 C 210 520 222 492 262 482 Q 381 476 470 492 C 512 500 535 515 540 548 C 543 600 536 680 522 735 C 512 775 490 796 450 798 L 262 798 C 230 797 214 780 212 740 Z";
const SCREEN_PATH =
  "M 247 548 C 249 528 262 522 290 518 Q 381 509 470 527 C 496 532 507 540 508 562 L 506 650 C 505 680 495 694 470 706 Q 381 728 290 708 C 262 702 248 690 246 660 Z";
const MOUTH_PATH =
  "M 336 639 Q 382 650 428 639 Q 437 638 434 650 C 427 679 407 691 382 691 C 357 691 337 679 330 650 Q 327 638 336 639 Z";

export const RESTING_POSE: MascotPose = {
  wave: 0,
  wink: 1,
  blink: 0,
  mouth: 1,
  antenna: 0,
  signalNear: 1,
  signalFar: 1,
  bounce: 0,
  squash: 0,
  lean: 0,
  decor: 1,
  footLeft: 0,
  footRight: 0,
  hand2: 0,
  wave2: 0,
  lookX: 0,
  lookY: 0,
};

/** Point on a circle, angle in degrees with y pointing down (270 is up). */
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${r} ${r} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function Star({ x, y, r, tilt, fill }: { x: number; y: number; r: number; tilt: number; fill: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const p = polar(x, y, i % 2 === 0 ? r : r * 0.52, -90 + tilt + i * 36);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
  return <polygon points={points} fill={fill} stroke={fill} strokeWidth={r * 0.36} strokeLinejoin="round" />;
}

// Finger axes measured from the logo, so each gap between fingers closes at
// the same depth as in the logo: two long fingers, then the thumb.
const FINGERS = [
  { from: [173, 650], to: [113, 553], width: 38.5 },
  { from: [205, 650], to: [172, 537], width: 42 },
  { from: [216, 684], to: [259, 620], width: 39 },
] as const;
// The palm and the little finger as one outline: the little finger widens
// towards the palm and its underside curves into the wrist without a corner.
const PALM_PATH =
  "M 105.6 610.2 L 152 645 L 142 640 C 170 628 236 632 256 664 C 264 690 252 722 222 734 C 196 744 168 732 154 708 C 149 699.4 142.5 688 136.5 680 C 131.7 673.6 121.1 664.4 114.4 660 L 84.4 640.5 A 18.5 18.5 0 1 1 105.6 610.2 Z";

/** Where the hand crosses the TV, the logo leaves this much clear space around it. */
const HAND_GAP = 6;

/** The waving hand: round-capped finger strokes over a palm, in one paint. */
function HandShape({ paint, grow = 0 }: { paint: string; grow?: number }) {
  return (
    <g>
      {FINGERS.map((f, i) => (
        <line
          key={i}
          x1={f.from[0]}
          y1={f.from[1]}
          x2={f.to[0]}
          y2={f.to[1]}
          stroke={paint}
          strokeWidth={f.width + grow * 2}
          strokeLinecap="round"
        />
      ))}
      <path d={PALM_PATH} fill={paint} stroke={grow > 0 ? paint : "none"} strokeWidth={grow * 2} strokeLinejoin="round" />
    </g>
  );
}

/**
 * The KinetoFun TV mascot, redrawn from the logo as separate parts. A pure
 * function of its pose, so the film can drive every part from one clock.
 */
export function Mascot({
  pose = RESTING_POSE,
  className,
  place,
}: {
  pose?: MascotPose;
  className?: string;
  /** Places the mascot inside a parent SVG: top left corner and width, in the parent's units. */
  place?: { x: number; y: number; width: number };
}) {
  const [, , boxWidth, boxHeight] = VIEW_BOX.split(" ").map(Number);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    body: `kfm-body-${uid}`,
    hand: `kfm-hand-${uid}`,
    clipBody: `kfm-clip-body-${uid}`,
    clipMouth: `kfm-clip-mouth-${uid}`,
    handGap: `kfm-hand-gap-${uid}`,
  };
  const handTransform = `rotate(${pose.wave.toFixed(2)} ${WRIST.x} ${WRIST.y})`;
  // The second hand grows out of its wrist, so it pops out of the side of the TV.
  const hand2Transform = `rotate(${pose.wave2.toFixed(2)} ${WRIST.x} ${WRIST.y}) translate(${WRIST.x} ${WRIST.y}) scale(${pose.hand2.toFixed(4)}) translate(${-WRIST.x} ${-WRIST.y})`;
  const showHand2 = pose.hand2 > 0.001;
  const foot = (offset: number) => ({ shift: Math.min(offset, 0), reach: Math.max(offset, 0) });
  const feet = { left: foot(pose.footLeft), right: foot(pose.footRight) };

  const squashY = 1 - pose.squash * 0.08;
  const squashX = 1 + pose.squash * 0.06;
  const leftEyeOpen = 1 - pose.wink;
  const rightEyeOpen = 1 - pose.blink;
  // A closing eye squashes first, then hands over to a happy arc so it never reads as a flat dash.
  const rightEyeArc = Math.min(Math.max((pose.blink - 0.6) / 0.3, 0), 1);

  return (
    <svg
      viewBox={VIEW_BOX}
      className={className}
      aria-hidden
      focusable="false"
      overflow="visible"
      {...(place && {
        x: place.x,
        y: place.y,
        width: place.width,
        height: (place.width * boxHeight) / boxWidth,
      })}
    >
      <defs>
        <linearGradient id={ids.body} x1="0" y1="476" x2="0" y2="812" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={MASCOT.bodyLight} />
          <stop offset="0.55" stopColor={MASCOT.body} />
          <stop offset="1" stopColor={MASCOT.bodyShade} />
        </linearGradient>
        <linearGradient id={ids.hand} x1="0" y1="520" x2="0" y2="740" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={MASCOT.handLight} />
          <stop offset="0.5" stopColor={MASCOT.hand} />
          <stop offset="1" stopColor={MASCOT.handShade} />
        </linearGradient>
        <clipPath id={ids.clipBody}>
          <path d={BODY_PATH} />
        </clipPath>
        <clipPath id={ids.clipMouth}>
          <path d={MOUTH_PATH} />
        </clipPath>
        {/* Cuts the hand's clear space out of the TV, so the gap shows whatever is behind the mascot. */}
        <mask id={ids.handGap} maskUnits="userSpaceOnUse" x={-200} y={200} width={1000} height={900}>
          <rect x={-200} y={200} width={1000} height={900} fill="#FFFFFF" />
          <g transform={handTransform}>
            <HandShape paint="#000000" grow={HAND_GAP} />
          </g>
          {showHand2 && (
            <g transform={MIRROR}>
              <g transform={hand2Transform}>
                <HandShape paint="#000000" grow={HAND_GAP} />
              </g>
            </g>
          )}
        </mask>
      </defs>

      {pose.decor > 0 && (
        <g opacity={pose.decor}>
          {/* Orbit swooshes around the base: green and pink behind on the left, blue in front on the right. */}
          <path d="M 100 697 C 66 750 64 800 104 830 C 150 866 220 880 285 880 C 220 870 165 850 130 818 C 104 790 94 750 100 697 Z" fill={MASCOT.green} />
          <path d="M 130 724 C 124 770 150 806 200 828 C 260 850 340 854 422 847 C 340 846 280 838 230 820 C 180 800 150 776 130 724 Z" fill={MASCOT.pink} />
          <Star x={170} y={402} r={22} tilt={-14} fill={MASCOT.pink} />
          <Star x={495} y={412} r={21} tilt={12} fill={MASCOT.body} />
          <circle cx={290} cy={442} r={12} fill={MASCOT.body} />
          <circle cx={102} cy={478} r={11} fill={MASCOT.green} />
          <circle cx={578} cy={690} r={8} fill={MASCOT.body} />
        </g>
      )}

      <g transform={`translate(0 ${pose.bounce.toFixed(2)}) rotate(${pose.lean.toFixed(2)} ${FACE_CENTRE_X} ${BASE_Y})`}>
        <g mask={`url(#${ids.handGap})`}>
          <g transform={`translate(${FACE_CENTRE_X} ${BASE_Y}) scale(${squashX} ${squashY}) translate(${-FACE_CENTRE_X} ${-BASE_Y})`}>
            {/* Antenna and signal arcs. */}
            <g transform={`rotate(${pose.antenna.toFixed(2)} ${ANTENNA_BASE.x} ${ANTENNA_BASE.y})`}>
              <line x1={ANTENNA_BASE.x} y1={ANTENNA_BASE.y} x2={ANTENNA_BALL.x} y2={ANTENNA_BALL.y + 10} stroke={MASCOT.green} strokeWidth={24} strokeLinecap="round" />
              <circle cx={ANTENNA_BALL.x} cy={ANTENNA_BALL.y} r={22} fill={MASCOT.green} />
              <circle cx={ANTENNA_BALL.x - 7} cy={ANTENNA_BALL.y - 7} r={6} fill="#FFFFFF" opacity={0.5} />
              <g fill="none" stroke={MASCOT.green} strokeWidth={13.5} strokeLinecap="round">
                <path d={arc(ANTENNA_BALL.x, ANTENNA_BALL.y, 42.5, 214, 282)} opacity={pose.signalNear} />
                <path d={arc(ANTENNA_BALL.x, ANTENNA_BALL.y, 72, 218, 277)} opacity={pose.signalFar} />
              </g>
            </g>

            {/* Feet, then the body with a darker underside band. */}
            <rect x={266} y={784 + feet.left.shift} width={64} height={24 + feet.left.reach} rx={12} fill={MASCOT.bodyShade} />
            <rect x={404} y={786 + feet.right.shift} width={78} height={27 + feet.right.reach} rx={13} fill={MASCOT.bodyShade} />
            <path d={BODY_PATH} fill={`url(#${ids.body})`} />
            <g clipPath={`url(#${ids.clipBody})`}>
              <path d="M 200 784 Q 380 774 560 784 L 560 820 L 200 820 Z" fill={MASCOT.bodyShade} opacity={0.75} />
            </g>
            <path d="M 224 552 Q 226 506 266 496" fill="none" stroke={MASCOT.bodyHighlight} strokeWidth={7} strokeLinecap="round" opacity={0.85} />

            {/* Screen. */}
            <path d={SCREEN_PATH} fill={MASCOT.screen} />

            {/* Face; the eyes follow what the mascot looks at. */}
            <g>
              <ellipse cx={298} cy={633} rx={17} ry={12} fill={MASCOT.cheek} />
              <ellipse cx={465} cy={637} rx={17} ry={12} fill={MASCOT.cheek} />

              <g transform={`translate(${pose.lookX.toFixed(2)} ${pose.lookY.toFixed(2)})`}>
                {/* Left eye: open oval that closes into the logo's wink. */}
                <g transform={`translate(0 590) scale(1 ${leftEyeOpen.toFixed(3)}) translate(0 -590)`} opacity={leftEyeOpen > 0.02 ? 1 : 0}>
                  <ellipse cx={329} cy={590} rx={20} ry={27} fill={MASCOT.ink} />
                  <ellipse cx={325} cy={581} rx={7} ry={9} fill="#FFFFFF" />
                </g>
                <path
                  d="M 313 580 Q 336 577 348 596 Q 333 598 313 603"
                  fill="none"
                  stroke={MASCOT.ink}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={pose.wink}
                />

                <g
                  transform={`translate(0 590) scale(1 ${Math.max(rightEyeOpen, 0.1).toFixed(3)}) translate(0 -590)`}
                  opacity={1 - rightEyeArc}
                >
                  <ellipse cx={433} cy={590} rx={20} ry={27} fill={MASCOT.ink} />
                  <ellipse cx={429} cy={581} rx={7} ry={9} fill="#FFFFFF" opacity={rightEyeOpen} />
                  <circle cx={444} cy={606} r={3.2} fill={MASCOT.sparkle} opacity={rightEyeOpen} />
                </g>
                <path
                  d="M 414 596 Q 433 578 452 596"
                  fill="none"
                  stroke={MASCOT.ink}
                  strokeWidth={8.5}
                  strokeLinecap="round"
                  opacity={rightEyeArc}
                />
              </g>

              <g transform={`translate(0 640) scale(1 ${(0.35 + 0.65 * pose.mouth).toFixed(3)}) translate(0 -640)`}>
                <path d={MOUTH_PATH} fill={MASCOT.ink} />
                <g clipPath={`url(#${ids.clipMouth})`}>
                  <ellipse cx={382} cy={694} rx={38} ry={27} fill={MASCOT.tongue} />
                </g>
              </g>
            </g>

            {/* Controls. */}
            <g fill={MASCOT.screen}>
              <rect x={273} y={748} width={47} height={15} rx={6} />
              <rect x={289} y={732} width={15} height={48} rx={6} />
            </g>
            <circle cx={418} cy={760} r={18} fill={MASCOT.pink} />
            <circle cx={462} cy={747} r={18.5} fill={MASCOT.greenButton} />
          </g>
        </g>
        <g transform={handTransform}>
          <HandShape paint={`url(#${ids.hand})`} />
        </g>
        {showHand2 && (
          <g transform={MIRROR}>
            <g transform={hand2Transform}>
              <HandShape paint={`url(#${ids.hand})`} />
            </g>
          </g>
        )}
      </g>

      {pose.decor > 0 && (
        <g opacity={pose.decor}>
          <path d="M 566 718 C 590 760 588 800 555 830 C 500 875 420 886 330 881 C 420 876 480 860 512 834 C 548 806 566 764 566 718 Z" fill={MASCOT.body} />
          <g stroke={MASCOT.hand} strokeWidth={13} strokeLinecap="round">
            <line x1={53} y1={562} x2={76} y2={582} />
            <line x1={32} y1={605} x2={57} y2={612} />
          </g>
        </g>
      )}
    </svg>
  );
}
