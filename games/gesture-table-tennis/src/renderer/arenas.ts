import type { ArenaId } from '../types';
import { ARENAS } from '../constants/gameConfig';

export function drawArenaBackground(
  ctx: CanvasRenderingContext2D,
  arenaId: ArenaId,
  W: number,
  H: number,
  time: number,
) {
  const arena = ARENAS.find(a => a.id === arenaId) ?? ARENAS[0];
  const [c1, c2] = arena.bgGradient;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  switch (arenaId) {
    case 'sportsHall':  drawSportsHall(ctx, W, H, time, arena.accentColor); break;
    case 'beach':       drawBeach(ctx, W, H, time); break;
    case 'rooftop':     drawRooftop(ctx, W, H, time, arena.accentColor); break;
    case 'cyber':       drawCyber(ctx, W, H, time, arena.accentColor); break;
    case 'forest':      drawForest(ctx, W, H, time, arena.accentColor); break;
    case 'space':       drawSpace(ctx, W, H, time, arena.accentColor); break;
    case 'neon':        drawNeon(ctx, W, H, time, arena.accentColor); break;
    case 'temple':      drawTemple(ctx, W, H, time, arena.accentColor); break;
  }
}

function drawSportsHall(ctx: CanvasRenderingContext2D, W: number, H: number, _t: number, accent: string) {
  // Floor tiles
  ctx.globalAlpha = 0.07;
  for (let x = 0; x < W; x += 60) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, H * 0.5); ctx.lineTo(x, H); ctx.stroke();
  }
  // Bleachers
  drawCrowd(ctx, W, H, '#4a5568', 0.12);
  ctx.globalAlpha = 1;
}

function drawBeach(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Animated water
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 5; i++) {
    const y = H * 0.15 + i * 12 + Math.sin(t * 1.2 + i) * 6;
    const wg = ctx.createLinearGradient(0, y, W, y);
    wg.addColorStop(0, '#0ea5e9'); wg.addColorStop(1, '#38bdf8');
    ctx.fillStyle = wg;
    ctx.fillRect(0, y, W, 8);
  }
  // Sun
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.08, 50, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.06;
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.08, 80, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRooftop(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // City skyline silhouette
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#1f2937';
  const buildings = [[0.05,0.7,0.08,0.3],[0.15,0.6,0.1,0.4],[0.25,0.75,0.06,0.25],[0.35,0.55,0.12,0.45],[0.5,0.65,0.08,0.35],[0.62,0.7,0.1,0.3],[0.75,0.58,0.08,0.42],[0.88,0.72,0.1,0.28]];
  for (const [bx, by, bw, bh] of buildings) {
    ctx.fillRect(bx * W, by * H, bw * W, bh * H);
  }
  // Blinking lights
  ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.4;
  ctx.fillStyle = accent;
  ctx.fillRect(0.38 * W, 0.56 * H, 3, 3);
  ctx.fillRect(0.67 * W, 0.59 * H, 3, 3);
  ctx.globalAlpha = 1;
}

function drawCyber(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // Grid lines
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Scanlines
  ctx.globalAlpha = 0.04;
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, W, 1);
  }
  // Animated circuit paths
  ctx.globalAlpha = 0.1 + Math.sin(t * 2) * 0.05;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 20]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(0, H*0.3); ctx.lineTo(W*0.3, H*0.3); ctx.lineTo(W*0.3, H*0.6); ctx.lineTo(W, H*0.6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawForest(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // Tree silhouettes
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#14532d';
  const trees = [[0,0.7,60,120],[0.1,0.65,50,140],[0.85,0.7,70,130],[0.92,0.66,55,120],[0.04,0.72,45,100]];
  for (const [tx, ty, tw, th] of trees) {
    drawTree(ctx, tx * W, ty * H, tw as number, th as number, t);
  }
  // Floating particles (fireflies)
  ctx.globalAlpha = 0.7 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = accent;
  const fireflyPositions = [[0.15, 0.55], [0.25, 0.7], [0.78, 0.6], [0.88, 0.75], [0.45, 0.5]];
  for (const [fx, fy] of fireflyPositions) {
    const offsetX = Math.sin(t * 1.5 + fx * 10) * 8;
    const offsetY = Math.cos(t * 1.3 + fy * 10) * 6;
    ctx.beginPath();
    ctx.arc(fx * W + offsetX, fy * H + offsetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  const sway = Math.sin(t * 0.8) * 3;
  ctx.save();
  ctx.translate(x + w/2, y);
  ctx.rotate(sway * 0.02);
  // Trunk
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-w*0.1, 0, w*0.2, h*0.35);
  // Canopy layers
  ctx.fillStyle = '#14532d';
  ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(-w/2,0); ctx.lineTo(w/2,0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-h*0.7); ctx.lineTo(-w*0.6,0); ctx.lineTo(w*0.6,0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSpace(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // Stars
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  const starPositions = [[0.1,0.1],[0.25,0.05],[0.4,0.2],[0.6,0.08],[0.75,0.15],[0.88,0.06],[0.15,0.35],[0.5,0.28],[0.9,0.3],[0.35,0.4]];
  for (const [sx, sy] of starPositions) {
    const twinkle = 0.3 + Math.sin(t * 2 + sx * 15 + sy * 10) * 0.7;
    ctx.globalAlpha = twinkle * 0.8;
    ctx.beginPath(); ctx.arc(sx * W, sy * H, 1.5 + twinkle, 0, Math.PI * 2); ctx.fill();
  }
  // Nebula glow
  ctx.globalAlpha = 0.06;
  const nebula = ctx.createRadialGradient(W*0.7, H*0.2, 0, W*0.7, H*0.2, 200);
  nebula.addColorStop(0, accent); nebula.addColorStop(1, 'transparent');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);
  // Planet
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#6366f1';
  ctx.beginPath(); ctx.arc(W*0.15, H*0.12, 45, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawNeon(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // Neon grid floor
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, H*0.4); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = H*0.4; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Neon signs
  ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 15;
  ctx.strokeRect(W * 0.05, H * 0.05, 80, 30);
  ctx.strokeRect(W * 0.82, H * 0.05, 80, 30);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTemple(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  // Temple pillars
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#292524';
  const pillars = [0.05, 0.2, 0.75, 0.9];
  for (const px of pillars) {
    ctx.fillRect(px * W, H * 0.15, W * 0.06, H * 0.55);
    // Pillar cap
    ctx.fillStyle = '#44403c';
    ctx.fillRect((px - 0.01) * W, H * 0.13, W * 0.08, H * 0.04);
    ctx.fillStyle = '#292524';
  }
  // Decorative lights
  ctx.globalAlpha = 0.5 + Math.sin(t * 1.5) * 0.3;
  ctx.fillStyle = accent;
  for (const px of pillars) {
    ctx.beginPath(); ctx.arc((px + 0.03) * W, H * 0.13, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCrowd(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  // Simple crowd row
  for (let x = 0; x < W; x += 14) {
    const h = 15 + Math.sin(x * 0.3) * 8;
    ctx.beginPath(); ctx.ellipse(x, H * 0.12, 6, h/2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, H * 0.12 - h/2 - 4, 5, 0, Math.PI * 2); ctx.fill();
  }
}

/** Animate the crowd reacting to a rally event */
export function drawCrowdReaction(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  excitement: number,
  time: number,
) {
  ctx.globalAlpha = 0.15 * excitement;
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < W; x += 14) {
    const wave = Math.sin(time * 4 + x * 0.2) * excitement * 10;
    ctx.beginPath();
    ctx.ellipse(x, H * 0.12 - wave, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
