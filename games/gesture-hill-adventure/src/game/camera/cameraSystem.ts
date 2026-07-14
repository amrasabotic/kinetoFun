/**
 * Smooth spring camera that follows the vehicle with look-ahead.
 * Zooms out at high speed and back in when slow.
 */
import type { Camera, Vehicle } from '../../types';
import {
  CAM_LERP_X, CAM_LERP_Y, CAM_LERP_ZOOM,
  CAM_LOOK_AHEAD, CAM_OFFSET_Y,
  CAM_ZOOM_DEFAULT, CAM_ZOOM_FAST, CAM_SPEED_ZOOM,
} from '../../constants/gameConfig';

export function createCamera(startX: number, startY: number): Camera {
  return {
    x:          startX,
    y:          startY,
    zoom:       CAM_ZOOM_DEFAULT,
    targetX:    startX,
    targetY:    startY,
    targetZoom: CAM_ZOOM_DEFAULT,
  };
}

/**
 * Update camera targets and lerp towards them.
 * @param speed  vehicle speed in px/s (used for zoom)
 * @param dt     delta time in ms
 */
export function updateCamera(
  cam:     Camera,
  vehicle: Vehicle,
  speed:   number,
  dt:      number,
): void {
  const vx = vehicle.chassis.position.x;
  const vy = vehicle.chassis.position.y;

  // Target is ahead of vehicle + slightly above
  cam.targetX = vx + CAM_LOOK_AHEAD;
  cam.targetY = vy + CAM_OFFSET_Y;

  // Zoom out at high speed
  const speedFrac  = Math.min(1, Math.max(0, (speed - CAM_SPEED_ZOOM) / (CAM_SPEED_ZOOM * 1.5)));
  cam.targetZoom   = CAM_ZOOM_DEFAULT - (CAM_ZOOM_DEFAULT - CAM_ZOOM_FAST) * speedFrac;

  const t = 1 - Math.pow(1 - CAM_LERP_X, dt / 16);
  cam.x    += (cam.targetX    - cam.x)    * Math.min(1, t);
  cam.y    += (cam.targetY    - cam.y)    * Math.min(1, CAM_LERP_Y * dt / 16);
  cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, CAM_LERP_ZOOM * dt / 16);
}

/**
 * Applies the camera transform to the canvas context.
 * Always call ctx.save() before and ctx.restore() after.
 */
export function applyCamera(
  ctx:    CanvasRenderingContext2D,
  cam:    Camera,
  width:  number,
  height: number,
): void {
  ctx.translate(width / 2, height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

/**
 * Converts a world-space point to screen space, given the camera.
 */
export function worldToScreen(
  wx: number, wy: number,
  cam: Camera, width: number, height: number,
): { sx: number; sy: number } {
  const sx = (wx - cam.x) * cam.zoom + width  / 2;
  const sy = (wy - cam.y) * cam.zoom + height / 2;
  return { sx, sy };
}

/**
 * Returns true if a world-space rectangle is visible on screen.
 */
export function isVisible(
  wx: number, wy: number, w: number, h: number,
  cam: Camera, cw: number, ch: number,
  margin = 200,
): boolean {
  const { sx, sy } = worldToScreen(wx, wy, cam, cw, ch);
  return sx + w * cam.zoom + margin > 0
      && sx              - margin < cw
      && sy + h * cam.zoom + margin > 0
      && sy              - margin < ch;
}
