import type { GatePlacement } from '../../types';
import { GATE_DEFS } from './gateDefs';
import { project } from '../camera/projection';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';

export function drawGate(
  ctx: CanvasRenderingContext2D,
  g: GatePlacement,
  camera: RunnerCamera,
  t: number,
): void {
  if (g.resolved) return;
  const def = GATE_DEFS[g.gateDefId];
  if (!def) return;
  const relZ = toRelativeZ(camera, g.z);
  if (relZ < -2 || relZ > 40) return;

  const base = project(g.laneX, relZ, 0);
  const top = project(g.laneX, relZ, 1.0);
  const glow = 0.6 + Math.sin(t / 220 + g.laneX) * 0.4;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = Math.max(2, 8 * base.scale);
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 14 * glow;

  const halfW = 46 * base.scale;
  ctx.beginPath();
  ctx.moveTo(base.x - halfW, base.y);
  ctx.lineTo(top.x - halfW * 0.8, top.y);
  ctx.lineTo(top.x + halfW * 0.8, top.y);
  ctx.lineTo(base.x + halfW, base.y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = `bold ${Math.max(14, 34 * base.scale)}px 'Baloo 2', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = def.color;
  ctx.fillText(def.label, (top.x + base.x) / 2, (top.y + base.y) / 2);
  ctx.restore();
}
