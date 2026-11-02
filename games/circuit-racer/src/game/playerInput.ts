import type { HandFrame } from '../types';

export interface PlayerInput {
  throttle: number;
  steer: number;
  boost: boolean;
}

// Hand left/right of this band around centre steers; inside it the car drives straight.
const STEER_DEADZONE = 0.05;
const STEER_FULL = 0.3;
const BRAKE_Y = 0.8;

/** Hand anywhere but the bottom of the frame drives forward; steering is relative to the car. */
export function mapHandToInput(hf: HandFrame, prevSteer: number, dt: number): PlayerInput {
  if (!hf.detected) return { throttle: 0, steer: prevSteer * Math.max(0, 1 - 8 * dt), boost: false };

  const off = hf.cursorX - 0.5;
  const mag = Math.max(0, Math.abs(off) - STEER_DEADZONE) / (STEER_FULL - STEER_DEADZONE);
  const target = Math.sign(off) * Math.min(1, mag);
  // Low-pass the steer so tracking jitter doesn't wobble the car.
  const steer = prevSteer + (target - prevSteer) * Math.min(1, 10 * dt);

  const boost = hf.isFist;
  const throttle = boost ? 1 : hf.cursorY > BRAKE_Y ? -1 : 1;
  return { throttle, steer, boost };
}
