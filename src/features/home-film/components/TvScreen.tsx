import { useId } from "react";
import { MASCOT, PALETTE, ROOM } from "../constants";
import { ANCHORS, FRAME_WIDTH } from "../logic/mascot-space";
import type { ScreenFrame } from "../logic/screen";
import { sizeScale } from "../logic/stops/shared";
import { FILM_LENGTH } from "../logic/timeline";
import type { PlayBox } from "../types";
import { Burst } from "./Burst";
import { CursorRing } from "./CursorRing";
import { Mascot } from "./Mascot";
import { StopLayer } from "./stops/StopLayer";

const { width: W, height: H } = ROOM.screen;

/** The top left corner of the mascot's view box, in logo pixels. */
const VIEW_ORIGIN = { x: 20, y: 350 };

/** Hold-to-select ring size on the TV, in screen units: larger while the room is in view, smaller in the stops. */
const CURSOR_SIZE = { room: 74, stop: 54 };

/**
 * Slow colour light behind the mascot, in the landing page's palette. Each
 * light circles a whole number of times per loop, so the last frame of the
 * film matches the first.
 */
const LIGHTS = [
  { x: 110, y: 70, r: 300, colour: PALETTE.yellow, opacity: 0.2, drift: 0 },
  { x: 700, y: 60, r: 300, colour: PALETTE.purple, opacity: 0.16, drift: 1.7 },
  { x: 660, y: 430, r: 320, colour: PALETTE.pink, opacity: 0.15, drift: 3.1 },
  { x: 60, y: 440, r: 300, colour: PALETTE.blue, opacity: 0.14, drift: 4.4 },
];
const LIGHT_TURNS = 2;

/**
 * What the TV shows, in screen units (0, 0 is the screen's top left corner):
 * a soft field in the landing page's colours, the mascot standing on it,
 * the props of the stop being played around it, and the hand cursor.
 */
export function TvScreen({ time, frame, box }: { time: number; frame: ScreenFrame; box: PlayBox }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { field: `kfs-field-${uid}`, light: (i: number) => `kfs-light-${i}-${uid}`, shadow: `kfs-shadow-${uid}` };
  const { spot, pose, cursor, stop } = frame;
  const scale = spot.width / FRAME_WIDTH;
  const turn = (2 * Math.PI * LIGHT_TURNS * time) / FILM_LENGTH;
  // The mascot's shadow tightens as it leaves the ground and is gone while it is below the screen.
  const lift = Math.max(0, -pose.bounce);
  const shadowScale = 1 / (1 + lift / 220);
  const shadowOpacity = pose.bounce > 0 ? Math.max(0, 1 - pose.bounce / 120) : 1;

  return (
    <g>
      <defs>
        <linearGradient id={ids.field} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EAF4FF" />
          <stop offset="0.58" stopColor="#D6E8FF" />
          <stop offset="1" stopColor="#EDF5FF" />
        </linearGradient>
        {LIGHTS.map((light, i) => (
          <radialGradient key={i} id={ids.light(i)}>
            <stop offset="0" stopColor={light.colour} stopOpacity={light.opacity} />
            <stop offset="1" stopColor={light.colour} stopOpacity={0} />
          </radialGradient>
        ))}
        <radialGradient id={ids.shadow}>
          <stop offset="0" stopColor={MASCOT.ink} stopOpacity={0.22} />
          <stop offset="1" stopColor={MASCOT.ink} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${ids.field})`} />
      {LIGHTS.map((light, i) => (
        <circle
          key={i}
          cx={light.x + 26 * Math.sin(turn + light.drift)}
          cy={light.y + 18 * Math.cos(turn + light.drift)}
          r={light.r}
          fill={`url(#${ids.light(i)})`}
        />
      ))}

      {stop && <StopLayer stop={stop} layer="back" box={box} />}
      <ellipse
        cx={spot.x}
        cy={spot.y + 6 * scale}
        rx={spot.width * 0.36 * shadowScale}
        ry={spot.width * 0.06 * shadowScale}
        fill={`url(#${ids.shadow})`}
        opacity={shadowOpacity}
      />
      <Mascot
        pose={pose}
        place={{
          x: spot.x - (ANCHORS.base.x - VIEW_ORIGIN.x) * scale,
          y: spot.y - (ANCHORS.base.y - VIEW_ORIGIN.y) * scale,
          width: spot.width,
        }}
      />
      {stop && <StopLayer stop={stop} layer="front" box={box} />}

      {frame.bursts.map((burst, i) => (
        <Burst key={i} burst={burst} />
      ))}
      {cursor && (
        <CursorRing
          x={cursor.point.x}
          y={cursor.point.y}
          size={stop ? CURSOR_SIZE.stop * sizeScale(box) : CURSOR_SIZE.room}
          fill={cursor.fill}
          shown={cursor.shown}
          swell={cursor.swell}
        />
      )}
    </g>
  );
}

/** The colour the screen throws onto the wall. */
export const SCREEN_GLOW = "#F4F9FF";
