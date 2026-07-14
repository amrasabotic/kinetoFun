import { useEffect, useRef } from 'react';
import {
  GameState, CANVAS_W, CANVAS_H, BUBBLE_R, BUBBLE_D, ROW_H,
  SHOOTER_X, SHOOTER_Y, DANGER_Y, GRID_TOP,
  cellX, cellY, EVEN_COLS, ODD_COLS, COLORS,
} from './gameLogic';

function bubbleGradient(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const g = ctx.createRadialGradient(x - BUBBLE_R * 0.35, y - BUBBLE_R * 0.35, 1, x, y, BUBBLE_R);
  g.addColorStop(0, lighten(color, 0.4));
  g.addColorStop(0.6, color);
  g.addColorStop(1, darken(color, 0.3));
  ctx.fillStyle = g;
}

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amt));
  const lg = Math.min(255, Math.round(g + (255 - g) * amt));
  const lb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `rgb(${lr},${lg},${lb})`;
}

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, BUBBLE_R, 0, Math.PI * 2);
  bubbleGradient(ctx, x, y, color);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Shine
  ctx.beginPath();
  ctx.arc(x - BUBBLE_R * 0.28, y - BUBBLE_R * 0.28, BUBBLE_R * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.restore();
}

function drawAimLine(ctx: CanvasRenderingContext2D, angle: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(SHOOTER_X, SHOOTER_Y);
  // Simulate one bounce off walls
  const dx = Math.cos(angle);
  const dy = -Math.sin(angle);
  let x = SHOOTER_X, y = SHOOTER_Y, vx = dx, vy = dy;
  const wallL = BUBBLE_R + 2, wallR = CANVAS_W - BUBBLE_R - 2;
  let dist = 0;
  const MAX = 320;
  while (dist < MAX) {
    const step = 4;
    x += vx * step;
    y += vy * step;
    dist += step;
    if (x < wallL) { x = wallL; vx = Math.abs(vx); }
    if (x > wallR) { x = wallR; vx = -Math.abs(vx); }
    ctx.lineTo(x, y);
    if (y < GRID_TOP) break;
  }
  ctx.stroke();
  ctx.restore();
}

export function useGameCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gsRef: React.MutableRefObject<GameState>,
  aimAngle: number,
  handX: number,
  handY: number,
  handDetected: boolean,
  videoRef: React.RefObject<HTMLVideoElement>,
): void {
  const aimRef = useRef(aimAngle);
  aimRef.current = aimAngle;
  const handXRef = useRef(handX);
  handXRef.current = handX;
  const handYRef = useRef(handY);
  handYRef.current = handY;
  const handDetRef = useRef(handDetected);
  handDetRef.current = handDetected;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;

    function draw() {
      rafId = requestAnimationFrame(draw);
      const gs = gsRef.current;
      if (!ctx || !canvas) return;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Danger line
      ctx.save();
      ctx.strokeStyle = 'rgba(239,68,68,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, DANGER_Y);
      ctx.lineTo(CANVAS_W, DANGER_Y);
      ctx.stroke();
      ctx.restore();

      // Grid empty slots hint (very faint)
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let r = 0; r < 14; r++) {
        const isEven = r % 2 === 0;
        const cols = isEven ? EVEN_COLS : ODD_COLS;
        for (let c = 0; c < cols; c++) {
          const x = cellX(r, c);
          const y = cellY(r);
          ctx.beginPath();
          ctx.arc(x, y, BUBBLE_R - 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Grid bubbles
      for (const b of gs.grid) {
        const x = cellX(b.row, b.col);
        const y = cellY(b.row);
        // Pulse slightly if near danger
        const nearDanger = y > DANGER_Y - ROW_H * 2;
        if (nearDanger) {
          ctx.save();
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
        }
        drawBubble(ctx!, x, y, b.color);
        if (nearDanger) ctx.restore();
      }

      // Particles
      for (const p of gs.particles) {
        ctx.save();
        ctx.globalAlpha = p.life * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, BUBBLE_R * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      // Webcam thumbnail bottom-left
      const vid = videoRef.current;
      if (vid && vid.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.roundRect(8, CANVAS_H - 82, 110, 74, 6);
        ctx.clip();
        ctx.scale(-1, 1);
        ctx.drawImage(vid, -118, CANVAS_H - 82, 110, 74);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(139,92,246,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(8, CANVAS_H - 82, 110, 74, 6);
        ctx.stroke();
        ctx.restore();
      }

      // Aim line (only when playing and hand detected)
      if (gs.phase === 'playing' && handDetRef.current) {
        drawAimLine(ctx!, aimRef.current, '#a78bfa');
      }

      // Flying bubble
      if (gs.flying) {
        drawBubble(ctx!, gs.flying.x, gs.flying.y, gs.flying.color);
      }

      // Shooter base
      ctx.save();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(SHOOTER_X, SHOOTER_Y + 20, 28, 0, Math.PI * 2);
      ctx.fill();
      // Shooter barrel — points along aim angle
      const bLen = 36;
      const bx = SHOOTER_X + Math.cos(aimRef.current) * bLen;
      const by = SHOOTER_Y - Math.sin(aimRef.current) * bLen;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, SHOOTER_Y);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();

      // Next bubble preview (in shooter base)
      drawBubble(ctx!, SHOOTER_X, SHOOTER_Y + 20, gs.nextColor, 0.85);

      // HUD top bar
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fillRect(0, 0, CANVAS_W, 26);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Level ${gs.level}`, 10, 17);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(`Score: ${Math.floor(gs.score)}`, CANVAS_W / 2, 17);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Best: ${Math.floor(gs.highScore)}`, CANVAS_W - 10, 17);
      ctx.restore();

      // Level-up overlay
      if (gs.phase === 'levelup') {
        ctx.save();
        ctx.fillStyle = 'rgba(139,92,246,0.18)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a78bfa';
        ctx.shadowColor = '#7c3aed';
        ctx.shadowBlur = 20;
        ctx.fillText(`Level ${gs.level}!`, CANVAS_W / 2, CANVAS_H / 2);
        ctx.restore();
      }

      // Hand cursor
      if (handDetRef.current) {
        const cx = handXRef.current * CANVAS_W;
        const cy = handYRef.current * CANVAS_H;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(167,139,250,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(167,139,250,0.25)';
        ctx.fill();
        ctx.restore();
      }

      // Color palette legend (bottom right, small)
      const palette = COLORS.slice(0, Math.min(3 + gs.level, COLORS.length));
      palette.forEach((c, i) => {
        const px = CANVAS_W - 22 - i * (BUBBLE_D - 4);
        const py = CANVAS_H - 18;
        ctx!.beginPath();
        ctx!.arc(px, py, BUBBLE_R - 6, 0, Math.PI * 2);
        ctx!.fillStyle = c;
        ctx!.fill();
      });
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef, gsRef, videoRef]);
}
