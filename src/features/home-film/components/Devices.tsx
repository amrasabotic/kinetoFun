import { MASCOT, PALETTE, ROOM } from "../constants";
import { bump } from "../logic/motion";
import { mix } from "./colour";

const C = ROOM.colours;

/**
 * The camera clipped to the top of the TV. While it tracks a hand its light
 * turns green and two signal arcs pulse above it, the same arcs as on the
 * mascot's antenna.
 */
export function CameraDevice({ tracking, time }: { tracking: number; time: number }) {
  const { x: cx, y: cy, width, height } = ROOM.camera;
  const left = cx - width / 2;
  const top = cy - height / 2;
  const led = { x: cx + width / 2 - 22, y: cy };
  const pulse = (offset: number) => 0.35 + 0.65 * bump(((time + offset) % 1.1) / 1.1, 0, 1);
  return (
    <g>
      {/* The clip's front lip rests on the bezel and stops short of the screen. */}
      <rect x={cx - 34} y={top + height - 8} width={68} height={ROOM.screen.y - (top + height - 8) - 2} rx={4} fill={C.device} />
      <rect x={left} y={top} width={width} height={height} rx={height / 2} fill={C.device} />
      <rect x={left + 10} y={top + 3} width={width - 20} height={5} rx={2.5} fill={C.deviceTop} />
      <circle cx={cx} cy={cy} r={14} fill={C.deviceTop} />
      <circle cx={cx} cy={cy} r={10} fill={C.lens} />
      <circle cx={cx - 3.5} cy={cy - 3.5} r={3} fill="#FFFFFF" opacity={0.7} />
      {tracking > 0 && <circle cx={led.x} cy={led.y} r={11} fill={PALETTE.green} opacity={0.3 * tracking} />}
      <circle cx={led.x} cy={led.y} r={4.5} fill={mix(C.ledOff, PALETTE.green, tracking)} />
      {tracking > 0 && (
        <g fill="none" stroke={MASCOT.green} strokeWidth={9} strokeLinecap="round" opacity={tracking}>
          <path d={`M ${cx - 26} ${top - 14} A 36 36 0 0 1 ${cx + 26} ${top - 14}`} opacity={pulse(0)} />
          <path d={`M ${cx - 46} ${top - 30} A 62 62 0 0 1 ${cx + 46} ${top - 30}`} opacity={pulse(-0.18)} />
        </g>
      )}
    </g>
  );
}

/** The console on the sideboard: a plain black box with a power light. */
export function ConsoleBox() {
  const { x, y, width, height, radius } = ROOM.console;
  return (
    <g>
      <rect x={x + 8} y={y + height - 4} width={width - 16} height={8} rx={4} fill="#000000" opacity={0.18} />
      <rect x={x} y={y} width={width} height={height} rx={radius} fill={C.device} />
      <rect x={x + 8} y={y + 3} width={width - 16} height={5} rx={2.5} fill={C.deviceTop} />
      <rect x={x + 14} y={y + height * 0.62} width={width - 64} height={3} rx={1.5} fill={C.deviceTop} />
      <rect x={x + width - 34} y={y + height * 0.62 - 1.5} width={18} height={6} rx={3} fill={PALETTE.green} />
    </g>
  );
}
