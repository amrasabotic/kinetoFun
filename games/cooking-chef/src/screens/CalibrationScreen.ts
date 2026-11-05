import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawPointer, leadHand } from '@/game/drawHelpers';
import { audioSynth } from '@/systems/AudioSynth';
import { drawStartBg, drawTitle, drawIcon, recipeCard, unit, font, INK, TOMATO, BASIL } from './startUi';

// Holding the cursor in the plate proves the camera sees the player and teaches the cursor in one step.
const HOLD = 1.2;
let holdTimer = 0;
let inside = false;
let seen = false;

export function initCalibration(): void { holdTimer = 0; inside = false; seen = false; }

function target(W: number, H: number) {
  return { x: W / 2, y: H * 0.58, r: 150 * unit(W, H) };
}

export function updateCalibration(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  const h = leadHand(hands);
  const t = target(window.innerWidth, window.innerHeight);
  seen = !!h;
  inside = !!h && Math.hypot(h.x - t.x, h.y - t.y) < t.r;
  if (inside) {
    holdTimer += dt;
    if (holdTimer >= HOLD) { audioSynth.resume(); audioSynth.fanfare(); dispatch({ type: 'CALIBRATION_DONE' }); holdTimer = 0; }
  } else {
    holdTimer = Math.max(0, holdTimer - dt * 2);
  }
}

export function drawCalibration(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  const u = unit(W, H);
  drawStartBg(ctx, W, H);
  drawTitle(ctx, W, H, H * 0.13, 'A cooking adventure you play with your hands');

  const t = target(W, H);
  const p = Math.min(1, holdTimer / HOLD);
  const pulse = 1 + 0.04 * Math.sin(performance.now() * 0.005);

  ctx.save();
  // Plate.
  ctx.fillStyle = 'rgba(59,35,20,0.15)'; ctx.beginPath(); ctx.ellipse(t.x + 8 * u, t.y + 14 * u, t.r * 1.15, t.r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 1.15 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(59,35,20,0.15)'; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.85, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = inside ? BASIL : TOMATO; ctx.lineWidth = 10 * u; ctx.setLineDash(inside ? [] : [26 * u, 18 * u]);
  ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 1.15 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  if (p > 0) {
    ctx.strokeStyle = BASIL; ctx.lineWidth = 22 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 1.15 + 26 * u, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
  }
  drawIcon(ctx, 'hand', t.x, t.y, 130 * u, inside ? BASIL : 'rgba(59,35,20,0.35)');
  ctx.restore();

  const msg = !seen ? 'Raise one hand so the camera can see it'
    : inside ? 'Hold it there…'
    : 'Move the ring onto the plate';
  const cardW = 1000 * u, cardH = 110 * u, cy = H * 0.86;
  ctx.save();
  recipeCard(ctx, W / 2 - cardW / 2, cy - cardH / 2, cardW, cardH, u, seen ? BASIL : TOMATO);
  ctx.font = font(46 * u, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  ctx.fillText(msg, W / 2, cy + 2 * u);
  ctx.restore();

  drawPointer(ctx, hands);
}
