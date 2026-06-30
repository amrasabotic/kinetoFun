import { TABLE_HALF_W, TABLE_HALF_L } from '../constants/gameConfig';

export interface ScreenPoint { x: number; y: number; scale: number; }

// Canvas dimensions (set once when canvas is known)
let CW = 1280, CH = 720;

export function setCanvasSize(w: number, h: number) { CW = w; CH = h; }

/**
 * Project a 3D world point to 2D screen coordinates.
 *
 * World coords:
 *   x  = horizontal across table  (-TABLE_HALF_W … +TABLE_HALF_W)
 *   y  = depth into table          (-TABLE_HALF_L = player, +TABLE_HALF_L = opponent)
 *   z  = height above table surface (0 = table, positive = up)
 *
 * The view is from above-behind the player looking toward the opponent.
 * The table appears as a perspective trapezoid.
 */
export function project(wx: number, wy: number, wz: number, tableOffX = 0): ScreenPoint {
  // Normalise depth: 0 = player's end, 1 = opponent's end
  const t = (wy + TABLE_HALF_L) / (TABLE_HALF_L * 2);

  // Trapezoid edges (near = player side, far = opponent side)
  const nearW = CW * 0.86;
  const farW  = CW * 0.36;
  const nearY = CH * 0.89;
  const farY  = CH * 0.18;
  const cx    = CW * 0.5 + tableOffX;

  // Interpolate width and base Y along depth
  const screenW = nearW + (farW - nearW) * t;
  const baseY   = nearY + (farY - nearY) * t;

  // X position with perspective foreshortening
  const screenX = cx + (wx / TABLE_HALF_W) * (screenW / 2);

  // Height scale decreases with distance (perspective)
  const heightScale = 95 * (1 - t * 0.38);
  const screenY = baseY - wz * heightScale;

  // Size scale (objects appear smaller farther away)
  const scale = 0.38 + (1 - t) * 0.62;

  return { x: screenX, y: screenY, scale };
}

/** Project a point that lies ON the table surface (z=0) */
export function projectTable(wx: number, wy: number, tableOffX = 0): ScreenPoint {
  return project(wx, wy, 0, tableOffX);
}

/** Convert two world points on table surface to two screen points for line drawing */
export function tableEdge(wx1: number, wy1: number, wx2: number, wy2: number, tableOffX = 0) {
  return { p1: projectTable(wx1, wy1, tableOffX), p2: projectTable(wx2, wy2, tableOffX) };
}
