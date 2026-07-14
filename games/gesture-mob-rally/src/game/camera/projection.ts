import { MAX_VIEW_DEPTH, TRACK_HALF_WIDTH } from '../../constants/gameConfig';

export interface ScreenPoint { x: number; y: number; scale: number; }

let CW = 1280, CH = 720;

export function setCanvasSize(w: number, h: number) { CW = w; CH = h; }
export function getCanvasSize(): { w: number; h: number } { return { w: CW, h: CH }; }

/**
 * Project a world point to 2D screen coordinates for a third-person,
 * behind-and-slightly-elevated runner camera. World coords:
 *   laneX  = horizontal across the track (-TRACK_HALF_WIDTH .. +TRACK_HALF_WIDTH)
 *   relZ   = depth ahead of camera (0 = right in front, MAX_VIEW_DEPTH = horizon)
 *   height = height above ground (0 = ground, positive = up — jump/bob)
 *
 * Ported from games/gesture-table-tennis's trapezoid projection technique,
 * renamed axes for a receding runway view instead of a table view.
 */
export function project(laneX: number, relZ: number, height: number): ScreenPoint {
  const t = 1 - Math.min(Math.max(relZ / MAX_VIEW_DEPTH, 0), 1); // 1 = near camera, 0 = horizon (inverted vs table)
  const depthT = 1 - t; // 0 = near, 1 = far — matches table's `t` convention below

  const nearW = CW * 0.98;
  const farW = CW * 0.10;
  const nearY = CH * 0.92;
  const farY = CH * 0.34;
  const cx = CW * 0.5;

  const screenW = nearW + (farW - nearW) * depthT;
  const baseY = nearY + (farY - nearY) * depthT;

  const screenX = cx + (laneX / TRACK_HALF_WIDTH) * (screenW / 2);

  const heightScale = 130 * (1 - depthT * 0.55);
  const screenY = baseY - height * heightScale;

  const scale = 0.22 + (1 - depthT) * 0.9;

  return { x: screenX, y: screenY, scale };
}

export function projectGround(laneX: number, relZ: number): ScreenPoint {
  return project(laneX, relZ, 0);
}

export function groundEdge(laneX1: number, relZ1: number, laneX2: number, relZ2: number) {
  return { p1: projectGround(laneX1, relZ1), p2: projectGround(laneX2, relZ2) };
}
