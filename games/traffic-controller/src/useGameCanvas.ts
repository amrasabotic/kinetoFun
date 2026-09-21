import { useCallback } from 'react';
import {
  CANVAS_W, CANVAS_H,
  ROAD_Y1, ROAD_Y2, ROAD_X1, ROAD_X2,
  LANE_NX, LANE_SX, LANE_EY, LANE_WY,
  ANGER_MS,
} from './gameLogic';
import type { GameState, CrossingCar, QueuedCar } from './gameLogic';
import type { GestureData } from './useGestureTracking';

// Geometry derived from road bounds
const IX = ROAD_X1;  // intersection left  340
const IY = ROAD_Y1;  // intersection top   220
const IW = ROAD_X2 - ROAD_X1;  // 120
const IH = ROAD_Y2 - ROAD_Y1;  // 120

const CAR_NS_W = 26;   // NS cars: narrow
const CAR_NS_H = 40;
const CAR_EW_W = 40;   // EW cars: wide
const CAR_EW_H = 26;

// Queue front positions (closest to stop line)
const QFRONT = {
  north: { x: LANE_NX, y: ROAD_Y1 - 10 },   // just above intersection
  south: { x: LANE_SX, y: ROAD_Y2 + 10 },   // just below
  east:  { x: ROAD_X2 + 10, y: LANE_EY },   // just right
  west:  { x: ROAD_X1 - 10, y: LANE_WY },   // just left
};
const QSTEP = 54;  // px between queued cars

// Car crossing positions
function crossingPos(from: CrossingCar['from'], t: number): { x: number; y: number } {
  switch (from) {
    case 'north': return { x: LANE_NX, y: IY - 20 + t * (CANVAS_H - IY + 20) };
    case 'south': return { x: LANE_SX, y: ROAD_Y2 + 20 - t * (ROAD_Y2 + 20) };
    case 'east':  return { x: ROAD_X2 + 20 - t * (ROAD_X2 + 20), y: LANE_EY };
    case 'west':  return { x: ROAD_X1 - 20 + t * (CANVAS_W - ROAD_X1 + 20), y: LANE_WY };
  }
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, ns: boolean) {
  const w = ns ? CAR_NS_W : CAR_EW_W;
  const h = ns ? CAR_NS_H : CAR_EW_H;
  ctx.save();
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  // Windshield (lighter rectangle on top half)
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  if (ns) {
    ctx.fillRect(x - w / 2 + 3, y - h / 2 + 4, w - 6, h * 0.3);
  } else {
    ctx.fillRect(x - w / 2 + 4, y - h / 2 + 3, w * 0.3, h - 6);
  }
  // Headlights
  ctx.fillStyle = '#fef3c7';
  if (ns) {
    ctx.fillRect(x - w / 2 + 2, y - h / 2 + 1, 5, 4);
    ctx.fillRect(x + w / 2 - 7, y - h / 2 + 1, 5, 4);
  } else {
    ctx.fillRect(x - w / 2 + 1, y - h / 2 + 2, 4, 5);
    ctx.fillRect(x - w / 2 + 1, y + h / 2 - 7, 4, 5);
  }
  ctx.restore();
}

function drawAngerBar(ctx: CanvasRenderingContext2D, x: number, y: number, waitMs: number, ns: boolean) {
  const pct = Math.min(waitMs / ANGER_MS, 1);
  if (pct < 0.3) return;
  const bw = ns ? CAR_NS_W + 4 : CAR_EW_W + 4;
  const bh = 4;
  const bx = x - bw / 2;
  const by = ns ? y - CAR_NS_H / 2 - 8 : y - CAR_EW_H / 2 - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, bw, bh);
  // Color: green → yellow → red
  const r = Math.round(pct < 0.5 ? pct * 2 * 255 : 255);
  const g = Math.round(pct < 0.5 ? 255 : (1 - (pct - 0.5) * 2) * 255);
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.fillRect(bx, by, bw * pct, bh);
}

function drawQueuedCars(
  ctx: CanvasRenderingContext2D,
  cars: QueuedCar[],
  from: 'north' | 'south' | 'east' | 'west',
) {
  const ns = from === 'north' || from === 'south';
  const fp = QFRONT[from];
  cars.forEach((car, i) => {
    let x = fp.x;
    let y = fp.y;
    if (from === 'north') y -= i * QSTEP + (i > 0 ? CAR_NS_H / 2 : CAR_NS_H / 2 + 4);
    if (from === 'south') y += i * QSTEP + (i > 0 ? CAR_NS_H / 2 : CAR_NS_H / 2 + 4);
    if (from === 'east')  x += i * QSTEP + (i > 0 ? CAR_EW_W / 2 : CAR_EW_W / 2 + 4);
    if (from === 'west')  x -= i * QSTEP + (i > 0 ? CAR_EW_W / 2 : CAR_EW_W / 2 + 4);
    if (x < -50 || x > CANVAS_W + 50 || y < -50 || y > CANVAS_H + 50) return;
    drawCar(ctx, x, y, car.color, ns);
    drawAngerBar(ctx, x, y, car.waitMs, ns);
  });
}

function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  green: boolean,
) {
  const R = 7;
  ctx.save();
  // Housing
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(x - R - 3, y - R * 2.2 - 3, R * 2 + 6, R * 4.4 + 6, 4);
  ctx.fill();
  // Red light
  ctx.fillStyle = green ? '#450a0a' : '#ef4444';
  ctx.shadowColor = green ? 'transparent' : '#ef4444';
  ctx.shadowBlur = green ? 0 : 12;
  ctx.beginPath();
  ctx.arc(x, y - R * 1.2, R, 0, Math.PI * 2);
  ctx.fill();
  // Green light
  ctx.fillStyle = green ? '#22c55e' : '#052e16';
  ctx.shadowColor = green ? '#22c55e' : 'transparent';
  ctx.shadowBlur = green ? 14 : 0;
  ctx.beginPath();
  ctx.arc(x, y + R * 1.2, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCrosswalk(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
) {
  const stripeW = Math.min(w, h) < 20 ? (w > h ? h : w) : 10;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const horiz = w > h;
  const count = Math.floor((horiz ? w : h) / (stripeW * 2));
  for (let i = 0; i < count; i++) {
    if (horiz) ctx.fillRect(x + i * stripeW * 2, y, stripeW, h);
    else       ctx.fillRect(x, y + i * stripeW * 2, w, stripeW);
  }
}

function drawPedGroup(
  ctx: CanvasRenderingContext2D,
  side: 'top' | 'bottom',
  t: number,          // 0 = waiting at side, >0 = crossing
  waiting: boolean,
) {
  // Peds cross horizontally across the V-road at top/bottom of intersection
  const y = side === 'top' ? ROAD_Y1 - 18 : ROAD_Y2 + 18;
  const count = 3;
  const spacing = 14;
  const cx = IX + IW / 2;  // center of intersection x-wise

  for (let i = 0; i < count; i++) {
    const offset = (i - 1) * spacing;
    let x: number;
    if (waiting) {
      // Wait on left side of V-road
      x = IX - 25 + offset * 0.3;
    } else {
      // Walk from left to right across V-road
      x = IX - 15 + t * (IW + 30) + offset * 0.5;
    }
    // Body (circle + stick)
    ctx.fillStyle = waiting ? '#fbbf24' : '#34d399';
    ctx.beginPath();
    ctx.arc(x + (cx - x) * 0, y, 5, 0, Math.PI * 2);
    // Keep it simple: just dot per pedestrian
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    // Legs (two short lines)
    ctx.strokeStyle = waiting ? '#fbbf24' : '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 5); ctx.lineTo(x - 3, y + 12);
    ctx.moveTo(x, y + 5); ctx.lineTo(x + 3, y + 12);
    ctx.stroke();
  }
}

const GESTURE_ICONS: Record<string, string> = {
  'point-right': '👉',
  'point-left':  '👈',
  'wave':        '👋',
  'stop':        '✋',
  'none':        '🤚',
};

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const draw = useCallback((
    gs: GameState,
    gesture: GestureData,
    videoEl: HTMLVideoElement | null,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nsGreen  = gs.trafficPhase === 'ns-green';
    const ewGreen  = gs.trafficPhase === 'ew-green';
    const pedPhase = gs.trafficPhase === 'ped';

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grass corners
    ctx.fillStyle = '#14532d';
    const corners = [
      { x: 0,       y: 0,       w: ROAD_X1, h: ROAD_Y1 },
      { x: ROAD_X2, y: 0,       w: CANVAS_W - ROAD_X2, h: ROAD_Y1 },
      { x: 0,       y: ROAD_Y2, w: ROAD_X1, h: CANVAS_H - ROAD_Y2 },
      { x: ROAD_X2, y: ROAD_Y2, w: CANVAS_W - ROAD_X2, h: CANVAS_H - ROAD_Y2 },
    ];
    for (const c of corners) ctx.fillRect(c.x, c.y, c.w, c.h);

    // Sidewalk edges
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, ROAD_Y1 - 8,       CANVAS_W, 8);
    ctx.fillRect(0, ROAD_Y2,            CANVAS_W, 8);
    ctx.fillRect(ROAD_X1 - 8, 0,       8,         CANVAS_H);
    ctx.fillRect(ROAD_X2,     0,       8,         CANVAS_H);

    // Road surfaces (horizontal + vertical)
    ctx.fillStyle = '#374151';
    ctx.fillRect(0,       ROAD_Y1, CANVAS_W, ROAD_Y2 - ROAD_Y1);
    ctx.fillRect(ROAD_X1, 0,       ROAD_X2 - ROAD_X1, CANVAS_H);

    // Intersection (slightly darker)
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(IX, IY, IW, IH);

    // ── Lane markings ─────────────────────────────────────────────────────────
    ctx.setLineDash([18, 14]);
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 2;
    // Center dividers
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, 0);       ctx.lineTo(CANVAS_W / 2, ROAD_Y1);    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, ROAD_Y2);  ctx.lineTo(CANVAS_W / 2, CANVAS_H);   ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,       CANVAS_H / 2); ctx.lineTo(ROAD_X1,      CANVAS_H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ROAD_X2, CANVAS_H / 2); ctx.lineTo(CANVAS_W,    CANVAS_H / 2); ctx.stroke();
    ctx.setLineDash([]);

    // Stop lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ROAD_X1, ROAD_Y1 + 2); ctx.lineTo(CANVAS_W / 2, ROAD_Y1 + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, ROAD_Y2 - 2); ctx.lineTo(ROAD_X2, ROAD_Y2 - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ROAD_X1 + 2, ROAD_Y1); ctx.lineTo(ROAD_X1 + 2, CANVAS_H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ROAD_X2 - 2, CANVAS_H / 2); ctx.lineTo(ROAD_X2 - 2, ROAD_Y2); ctx.stroke();

    // ── Crosswalks ────────────────────────────────────────────────────────────
    // Top crosswalk (across V-road, above intersection)
    drawCrosswalk(ctx, IX, ROAD_Y1 - 24, IW, 14);
    // Bottom crosswalk
    drawCrosswalk(ctx, IX, ROAD_Y2 + 10, IW, 14);
    // Left crosswalk (across H-road, left of intersection)
    drawCrosswalk(ctx, ROAD_X1 - 24, IY, 14, IH);
    // Right crosswalk
    drawCrosswalk(ctx, ROAD_X2 + 10, IY, 14, IH);

    // ── Trees in corners (simple circles) ────────────────────────────────────
    const treePositions = [
      [50, 60], [120, 90], [50, 160],
      [700, 50], [740, 130], [660, 100],
      [70, 420], [140, 460], [55, 490],
      [720, 400], [700, 480], [750, 450],
    ];
    for (const [tx, ty] of treePositions) {
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(tx, ty, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(tx - 5, ty - 5, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Traffic lights ────────────────────────────────────────────────────────
    // Place them just outside the intersection on each approach
    drawTrafficLight(ctx, LANE_NX, ROAD_Y1 - 32, nsGreen);    // N approach
    drawTrafficLight(ctx, LANE_SX, ROAD_Y2 + 32, nsGreen);    // S approach
    drawTrafficLight(ctx, ROAD_X2 + 28, LANE_EY, ewGreen);    // E approach
    drawTrafficLight(ctx, ROAD_X1 - 28, LANE_WY, ewGreen);    // W approach

    // ── Pedestrian crossing signals ───────────────────────────────────────────
    // Small walk/don't-walk indicators at top/bottom crosswalks
    for (const sy of [ROAD_Y1 - 28, ROAD_Y2 + 28]) {
      const waiting = gs.pedGroups.some(p => {
        const side = sy < CANVAS_H / 2 ? 'top' : 'bottom';
        return p.side === side && !p.crossing;
      });
      ctx.fillStyle = pedPhase ? '#22c55e' : (waiting ? '#eab308' : '#374151');
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pedPhase ? '🚶' : (waiting ? '🧍' : '🚫'), ROAD_X2 + 30, sy);
    }

    // ── Queued cars ───────────────────────────────────────────────────────────
    drawQueuedCars(ctx, gs.queues.north, 'north');
    drawQueuedCars(ctx, gs.queues.south, 'south');
    drawQueuedCars(ctx, gs.queues.east,  'east');
    drawQueuedCars(ctx, gs.queues.west,  'west');

    // ── Crossing cars ─────────────────────────────────────────────────────────
    for (const car of gs.crossingCars) {
      const ns = car.from === 'north' || car.from === 'south';
      const pos = crossingPos(car.from, car.t);
      drawCar(ctx, pos.x, pos.y, car.color, ns);
    }

    // ── Pedestrians ───────────────────────────────────────────────────────────
    for (const pg of gs.pedGroups) {
      drawPedGroup(ctx, pg.side, pg.t, !pg.crossing);
    }

    // ── Strike flash overlay ──────────────────────────────────────────────────
    if (gs.strikeFlashMs > 0) {
      const alpha = (gs.strikeFlashMs / 1600) * 0.35;
      ctx.fillStyle = `rgba(239,68,68,${alpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ── Phase timer bar (shows how long current phase has been active) ────────
    const phasePct = Math.min(gs.phaseMs / 7500, 1);
    const barColor = gs.trafficPhase === 'ns-green' ? '#22c55e'
      : gs.trafficPhase === 'ew-green' ? '#3b82f6'
      : gs.trafficPhase === 'ped'      ? '#fbbf24'
      : '#6b7280';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, CANVAS_H - 6, CANVAS_W, 6);
    ctx.fillStyle = barColor;
    ctx.fillRect(0, CANVAS_H - 6, CANVAS_W * (1 - phasePct), 6);

    // ── HUD top bar ───────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, 40);

    // Score
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${Math.floor(gs.score)}`, 14, 20);

    // Strikes
    ctx.textAlign = 'center';
    ctx.fillText('Strikes:', CANVAS_W / 2 - 40, 20);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < gs.strikes ? '#ef4444' : '#374151';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText('✕', CANVAS_W / 2 + i * 22, 21);
    }

    // Traffic phase label
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px system-ui';
    const phaseLabel =
      gs.trafficPhase === 'ns-green' ? '↑↓ N-S GREEN' :
      gs.trafficPhase === 'ew-green' ? '← → E-W GREEN' :
      gs.trafficPhase === 'ped'      ? '🚶 PED CROSSING' : '⬛ ALL RED';
    const phaseColor =
      gs.trafficPhase === 'ns-green' ? '#4ade80' :
      gs.trafficPhase === 'ew-green' ? '#60a5fa' :
      gs.trafficPhase === 'ped'      ? '#fbbf24' : '#9ca3af';
    ctx.fillStyle = phaseColor;
    ctx.fillText(phaseLabel, CANVAS_W - 14, 20);

    // ── Gesture prompt (mid-screen, subtle) ───────────────────────────────────
    if (gesture.detected) {
      const icon = GESTURE_ICONS[gesture.gesture] ?? '🤚';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, CANVAS_W / 2, CANVAS_H / 2);
    }

    // ── Webcam thumbnail ──────────────────────────────────────────────────────
    if (videoEl && videoEl.readyState >= 2) {
      const tw = 110, th = 83;
      const tx = CANVAS_W - tw - 8, ty = CANVAS_H - th - 12;
      ctx.save();
      ctx.translate(tx + tw, ty); ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, tw, th);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    }
  }, [canvasRef]);

  return draw;
}
