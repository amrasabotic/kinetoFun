import { useCallback, useRef } from 'react';
import type { GameState } from './gameLogic';
import { TABLE } from './gameLogic';

interface DrawOptions {
  state: GameState;
  handDetected: boolean;
}

export function useGameCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: DrawOptions
) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const sx = W / TABLE.width;
    const sy = H / TABLE.height;

    const { state } = optsRef.current;

    ctx.clearRect(0, 0, W, H);

    // ── Table background ──────────────────────────────────────────
    // Shadow/outer frame
    ctx.fillStyle = '#0f3d1c';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 12);
    ctx.fill();

    // Main surface gradient
    const surfaceGrad = ctx.createLinearGradient(0, 0, W, H);
    surfaceGrad.addColorStop(0, '#1b6b31');
    surfaceGrad.addColorStop(0.5, '#217a38');
    surfaceGrad.addColorStop(1, '#1a6430');
    ctx.fillStyle = surfaceGrad;
    ctx.beginPath();
    ctx.roundRect(6 * sx, 6 * sy, (TABLE.width - 12) * sx, (TABLE.height - 12) * sy, 8);
    ctx.fill();

    // Subtle wood-grain lines (horizontal texture)
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < TABLE.height; i += 18) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6 * sx, i * sy);
      ctx.lineTo((TABLE.width - 6) * sx, i * sy);
      ctx.stroke();
    }
    ctx.restore();

    // White border (outer line)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6 * sx, 6 * sy, (TABLE.width - 12) * sx, (TABLE.height - 12) * sy, 8);
    ctx.stroke();

    // Side-line insets (thinner inner line — like real tables have)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    const inset = 22;
    ctx.beginPath();
    ctx.roundRect(inset * sx, inset * sy, (TABLE.width - inset * 2) * sx, (TABLE.height - inset * 2) * sy, 4);
    ctx.stroke();

    // ── Net area ─────────────────────────────────────────────────
    const netY = TABLE.netY * sy;

    // Net shadow strip
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, netY - 2, W, 10);

    // Net base bar (dark wood)
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(0, netY - 1, W, 7);

    // Net white strip
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, netY - 1, W, 4);

    // Net mesh lines (vertical dashes)
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let nx = 0; nx < W; nx += 7) {
      ctx.beginPath();
      ctx.moveTo(nx, netY + 3);
      ctx.lineTo(nx, netY + 7);
      ctx.stroke();
    }
    ctx.restore();

    // Net post pillars
    for (const px of [0, W]) {
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.roundRect(px - 5, netY - 6, 10, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(px - 3, netY - 5, 6, 14, 2);
      ctx.fill();
    }

    // Centre line (dashed, half-length each side)
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    // top half
    ctx.beginPath();
    ctx.moveTo(W / 2, 6 * sy);
    ctx.lineTo(W / 2, netY - 4);
    ctx.stroke();
    // bottom half
    ctx.beginPath();
    ctx.moveTo(W / 2, netY + 8);
    ctx.lineTo(W / 2, (TABLE.height - 6) * sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Guideline for player hand area
    const guideY = TABLE.paddleY * sy;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(255,220,50,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(inset * sx, guideY);
    ctx.lineTo((TABLE.width - inset) * sx, guideY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Paddles ───────────────────────────────────────────────────
    drawRealPaddle(ctx, state.playerPaddle.x * sx, TABLE.paddleY * sy, sx, sy, '#cc3a1e', false);
    drawRealPaddle(ctx, state.botPaddle.x * sx, TABLE.botPaddleY * sy, sx, sy, '#2a6bb5', true);

    // ── Ball ──────────────────────────────────────────────────────
    const bx = state.ball.x * sx;
    const by = state.ball.y * sy;
    const br = TABLE.ballRadius * Math.min(sx, sy);

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    // Ball body
    const ballGrad = ctx.createRadialGradient(bx - br * 0.32, by - br * 0.38, br * 0.04, bx, by, br);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.55, '#f5f5f5');
    ballGrad.addColorStop(1, '#c8c8c8');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Ball seam line
    ctx.save();
    ctx.strokeStyle = 'rgba(180,180,180,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, br * 0.85, -0.3, Math.PI + 0.3);
    ctx.stroke();
    ctx.restore();

  }, [canvasRef]);

  return draw;
}

/**
 * Draws a realistic ping-pong paddle centered at (cx, cy).
 * The paddle is horizontal with a round blade + handle nub on the side.
 */
function drawRealPaddle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  sx: number, sy: number,
  color: string,
  isBot: boolean
) {
  const pw = TABLE.paddleWidth * sx;
  const ph = TABLE.paddleHeight * sy;
  const r = ph / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = isBot ? -3 : 3;

  // ── Blade outline (slight 3-D edge) ──
  ctx.fillStyle = darken(color, 0.35);
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2, cy - r + 2, pw, ph + 1, r);
  ctx.fill();

  // ── Rubber face ──
  const faceGrad = ctx.createLinearGradient(cx - pw / 2, cy - r, cx + pw / 2, cy + r);
  faceGrad.addColorStop(0, lighten(color, 0.18));
  faceGrad.addColorStop(0.5, color);
  faceGrad.addColorStop(1, darken(color, 0.2));
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2, cy - r, pw, ph, r);
  ctx.fill();

  // ── Rubber surface pimple texture (subtle dots) ──
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000000';
  const dotSpacing = 8 * sx;
  const dotR = 2 * sx;
  for (let dx = cx - pw / 2 + dotSpacing; dx < cx + pw / 2 - dotSpacing * 0.5; dx += dotSpacing) {
    ctx.beginPath();
    ctx.arc(dx, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Highlight ──
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2 + 8 * sx, cy - r + 2, pw * 0.45, ph * 0.45, r * 0.5);
  ctx.fill();

  // ── Handle (wood nub) ──
  const handleW = 18 * sx;
  const handleH = ph * 0.75;
  const handleX = isBot
    ? cx - pw / 2 - handleW * 0.6
    : cx + pw / 2 - handleW * 0.4;

  // Wood base
  const woodGrad = ctx.createLinearGradient(handleX, cy - handleH / 2, handleX + handleW, cy + handleH / 2);
  woodGrad.addColorStop(0, '#c48c40');
  woodGrad.addColorStop(0.5, '#a06828');
  woodGrad.addColorStop(1, '#7a4e18');
  ctx.shadowBlur = 0;
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.roundRect(handleX - handleW / 2, cy - handleH / 2, handleW, handleH, 3);
  ctx.fill();

  // Wood grain lines
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#5a3510';
  ctx.lineWidth = 0.8;
  for (let gi = -1; gi <= 1; gi++) {
    ctx.beginPath();
    ctx.moveTo(handleX - handleW / 2 + 2, cy + gi * (handleH / 4));
    ctx.lineTo(handleX + handleW / 2 - 2, cy + gi * (handleH / 4));
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + 255 * amount)},${Math.min(255, g + 255 * amount)},${Math.min(255, b + 255 * amount)})`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 255 * amount)},${Math.max(0, g - 255 * amount)},${Math.max(0, b - 255 * amount)})`;
}
