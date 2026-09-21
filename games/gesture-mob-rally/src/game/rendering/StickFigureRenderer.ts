import type { StickFigureUnit } from '../../types';
import { project } from '../camera/projection';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';
import { COLOR_THEMES } from '../cosmetics/cosmeticDefs';

export function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  u: StickFigureUnit,
  camera: RunnerCamera,
  glow: boolean,
): void {
  const relZ = toRelativeZ(camera, u.depthZ);
  if (relZ < -3 || relZ > 44) return;

  const p = project(u.laneX, relZ, u.height);
  const scale = p.scale;
  if (scale < 0.015) return;

  const theme = COLOR_THEMES[u.colorIndex % COLOR_THEMES.length];
  const bodyColor = u.team === 'enemy' ? '#EF4444' : theme.color;
  const legSwing = Math.sin(u.animPhase) * 10;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);

  if (glow) {
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 24;
  }

  ctx.strokeStyle = bodyColor;
  ctx.fillStyle = bodyColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';

  // Legs
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(-10 + legSwing * 0.4, 28);
  ctx.moveTo(0, -8); ctx.lineTo(10 - legSwing * 0.4, 28);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(0, -44);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(0, -38); ctx.lineTo(-16 - legSwing * 0.3, -18);
  ctx.moveTo(0, -38); ctx.lineTo(16 + legSwing * 0.3, -18);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, -58, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Cosmetics
  if (u.hatId) drawHat(ctx, u.hatId);
  if (u.capeId) drawCape(ctx, u.capeId, bodyColor);

  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, hatId: string) {
  ctx.save();
  ctx.translate(0, -68);
  if (hatId === 'helmet') {
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI, 0); ctx.fill();
  } else if (hatId === 'partyHat') {
    ctx.fillStyle = '#F472B6';
    ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(10, 6); ctx.lineTo(0, -18); ctx.closePath(); ctx.fill();
  } else if (hatId === 'crown') {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-12, -2, 24, 8);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 8 - 4, -2); ctx.lineTo(i * 8, -14); ctx.lineTo(i * 8 + 4, -2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawCape(ctx: CanvasRenderingContext2D, capeId: string, fallback: string) {
  ctx.save();
  ctx.fillStyle = capeId === 'flameCape' ? '#FB923C' : capeId === 'shadowCape' ? '#4C1D95' : fallback;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.lineTo(14, 4); ctx.lineTo(-14, 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
