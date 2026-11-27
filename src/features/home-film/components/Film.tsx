import { useId } from "react";
import { PALETTE } from "../constants";
import type { FilmFormat } from "../types";
import { cameraAt, cameraTransform, roomAmount } from "../logic/camera";
import { trackingAt } from "../logic/hand-path";
import { LINE_BOXES, LINE_CUES, LINE_KEYS } from "../logic/lines";
import { screenAt } from "../logic/screen";
import { CameraDevice, ConsoleBox } from "./Devices";
import { KineticLine } from "./KineticLine";
import type { FittedLines } from "./line-sizes";
import { Room } from "./Room";
import { Child } from "./Child";
import { SCREEN_GLOW, TvScreen } from "./TvScreen";

/**
 * One frame of the film: a pure function of `time`. The room is SVG framed
 * by a camera transform inside the SVG, so it stays sharp at every zoom;
 * the words sit on top as HTML in stage px. `text` is null until the
 * display face has loaded and the words have been fitted to their boxes.
 */
export function Film({ time, format, text }: { time: number; format: FilmFormat; text: FittedLines | null }) {
  const camera = cameraAt(time, format);
  const tracking = trackingAt(time);
  const room = roomAmount(time);
  const screen = screenAt(time, format);
  const vignetteId = `kff-vignette-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div style={{ position: "relative", width: format.width, height: format.height, overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${format.width} ${format.height}`}
        width={format.width}
        height={format.height}
        style={{ position: "absolute", inset: 0, display: "block" }}
      >
        <g transform={cameraTransform(camera, format)}>
          <Room screen={<TvScreen time={time} frame={screen} box={format.playBox} />} glare={room} glow={SCREEN_GLOW}>
            {room > 0 && (
              <>
                <CameraDevice tracking={tracking} time={time} />
                <ConsoleBox />
                <Child time={time} tracking={tracking} />
              </>
            )}
          </Room>
        </g>
        {/* Darker corners once the room is in view, so the eye settles on the TV. */}
        <defs>
          <radialGradient id={vignetteId} cx="50%" cy="45%" r="75%">
            <stop offset="0.55" stopColor={PALETTE.ink} stopOpacity={0} />
            <stop offset="1" stopColor={PALETTE.ink} stopOpacity={0.16} />
          </radialGradient>
        </defs>
        {room > 0 && <rect width={format.width} height={format.height} fill={`url(#${vignetteId})`} opacity={room} />}
      </svg>
      {text &&
        LINE_KEYS.map((key) => <KineticLine key={key} text={text[key]} box={format[LINE_BOXES[key]]} cue={LINE_CUES[key]} time={time} />)}
    </div>
  );
}
