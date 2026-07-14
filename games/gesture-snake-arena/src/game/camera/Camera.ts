import { lerp, clamp } from '../../utils/mathUtils';
import {
  CAM_LERP, CAM_LOOK_AHEAD,
  CAM_ZOOM_SMALL, CAM_ZOOM_LARGE,
  CAM_ZOOM_THRESHOLD_SMALL, CAM_ZOOM_THRESHOLD_LARGE,
  ARENA_WIDTH, ARENA_HEIGHT,
} from '../../constants/gameConfig';
import type { CameraState } from '../../types';

export function createCamera(cx: number, cy: number): CameraState {
  return { x: cx, y: cy, zoom: 1, targetX: cx, targetY: cy, targetZoom: 1 };
}

export function updateCamera(
  cam: CameraState,
  headX: number,
  headY: number,
  angle: number,
  snakeLength: number,
  viewW: number,
  viewH: number,
): void {
  // Look-ahead offset
  const lookX = headX + Math.cos(angle) * CAM_LOOK_AHEAD;
  const lookY = headY + Math.sin(angle) * CAM_LOOK_AHEAD;

  cam.targetX = lookX;
  cam.targetY = lookY;

  // Adaptive zoom
  const t = clamp(
    (snakeLength - CAM_ZOOM_THRESHOLD_SMALL) / (CAM_ZOOM_THRESHOLD_LARGE - CAM_ZOOM_THRESHOLD_SMALL),
    0, 1,
  );
  cam.targetZoom = lerp(CAM_ZOOM_SMALL, CAM_ZOOM_LARGE, t);

  // Smooth follow
  cam.zoom = lerp(cam.zoom, cam.targetZoom, CAM_LERP);
  cam.x = lerp(cam.x, cam.targetX, CAM_LERP);
  cam.y = lerp(cam.y, cam.targetY, CAM_LERP);

  // Clamp so we don't show outside the arena
  const halfW = (viewW / 2) / cam.zoom;
  const halfH = (viewH / 2) / cam.zoom;
  cam.x = clamp(cam.x, halfW, ARENA_WIDTH  - halfW);
  cam.y = clamp(cam.y, halfH, ARENA_HEIGHT - halfH);
}

/** World → screen transform */
export function worldToScreen(
  cam: CameraState,
  wx: number, wy: number,
  viewW: number, viewH: number,
): { sx: number; sy: number } {
  return {
    sx: (wx - cam.x) * cam.zoom + viewW / 2,
    sy: (wy - cam.y) * cam.zoom + viewH / 2,
  };
}

/** Screen → world transform */
export function screenToWorld(
  cam: CameraState,
  sx: number, sy: number,
  viewW: number, viewH: number,
): { wx: number; wy: number } {
  return {
    wx: (sx - viewW / 2) / cam.zoom + cam.x,
    wy: (sy - viewH / 2) / cam.zoom + cam.y,
  };
}
