import type { ObstaclePlacement } from '../../types';
import { OBSTACLE_DEFS } from './obstacleDefs';
import { project } from '../camera/projection';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: ObstaclePlacement,
  camera: RunnerCamera,
  accentColor: string,
): void {
  if (o.destroyed) return;
  const def = OBSTACLE_DEFS[o.obstacleDefId];
  if (!def) return;
  const relZ = toRelativeZ(camera, o.z);
  if (relZ < -2 || relZ > 40) return;

  const p = project(o.laneX, relZ, 0.05);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale, p.scale);
  ctx.globalAlpha = o.hit ? 0.35 : 1;

  const swing = Math.sin(o.animPhase);
  const spin = o.animPhase % (Math.PI * 2);

  switch (def.kind) {
    case 'hammer': drawHammer(ctx, spin, accentColor); break;
    case 'axe': drawAxe(ctx, swing, accentColor); break;
    case 'wall': drawWall(ctx, def.laneSpan, accentColor); break;
    case 'barrel': drawBarrel(ctx, spin, accentColor); break;
    case 'spike': drawSpike(ctx, accentColor); break;
    case 'laser': drawLaser(ctx, def.laneSpan, swing, accentColor); break;
    case 'crusher': drawCrusher(ctx, swing, accentColor); break;
    case 'saw': drawSaw(ctx, spin, accentColor); break;
  }

  ctx.restore();
}

function drawHammer(ctx: CanvasRenderingContext2D, angle: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
  ctx.translate(0, -70);
  ctx.rotate(Math.sin(angle) * 0.9);
  ctx.fillStyle = '#8B94A3';
  ctx.fillRect(-40, -70, 80, 26);
  ctx.restore();
}

function drawAxe(ctx: CanvasRenderingContext2D, swing: number, accent: string) {
  ctx.save();
  ctx.strokeStyle = '#5C4326'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, -90); ctx.lineTo(0, 0); ctx.stroke();
  ctx.translate(0, -60);
  ctx.rotate(swing * 0.7);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-6, -20); ctx.lineTo(45, -40); ctx.lineTo(45, 40); ctx.lineTo(-6, 20); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, span: number, accent: string) {
  const w = 60 * span;
  ctx.fillStyle = accent;
  ctx.fillRect(-w / 2, -90, w, 90);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
  for (let i = -w / 2; i < w / 2; i += 24) ctx.strokeRect(i, -90, 24, 90);
}

function drawBarrel(ctx: CanvasRenderingContext2D, spin: number, accent: string) {
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(spin);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
  ctx.restore();
}

function drawSpike(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.fillStyle = accent;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 22 - 10, 0);
    ctx.lineTo(i * 22, -60);
    ctx.lineTo(i * 22 + 10, 0);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLaser(ctx: CanvasRenderingContext2D, span: number, pulse: number, accent: string) {
  const w = 60 * span;
  ctx.save();
  ctx.globalAlpha = 0.65 + pulse * 0.25;
  ctx.fillStyle = accent;
  ctx.fillRect(-w / 2, -46, w, 10);
  ctx.restore();
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-w / 2 - 10, -60, 16, 60);
  ctx.fillRect(w / 2 - 6, -60, 16, 60);
}

function drawCrusher(ctx: CanvasRenderingContext2D, swing: number, accent: string) {
  const drop = Math.max(0, swing) * 40;
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-8, -140, 16, 140 - drop);
  ctx.fillStyle = accent;
  ctx.fillRect(-45, -60 - drop, 90, 40);
}

function drawSaw(ctx: CanvasRenderingContext2D, spin: number, accent: string) {
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(spin * 4);
  ctx.fillStyle = accent;
  const teeth = 10;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const r = i % 2 === 0 ? 30 : 20;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#64748B';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
