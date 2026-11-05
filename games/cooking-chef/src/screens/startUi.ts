import { card } from '@/game/drawHelpers';

export const INK = '#3b2314';
export const CREAM = '#fff6e6';
export const TOMATO = '#e8462e';
export const BASIL = '#3f9b4f';
export const BUTTER = '#f4b63a';

// Sizes are designed at 1920x1080 and scaled, so text stays readable from a sofa.
export const unit = (W: number, H: number) => Math.min(W / 1920, H / 1080);

export const font = (px: number, weight = 800) => `${weight} ${Math.round(px)}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;

let steamT = 0;

export function drawStartBg(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  steamT += 0.016;
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#fbe3c2'); wall.addColorStop(1, '#f2c894');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);

  // Subway tiles on the wall.
  const tw = 120 * unit(W, H), th = tw / 2;
  ctx.strokeStyle = 'rgba(160,100,50,0.13)'; ctx.lineWidth = 2;
  for (let row = 0, y = 0; y < H * 0.8; row++, y += th) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    for (let x = row % 2 ? tw / 2 : 0; x < W; x += tw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + th); ctx.stroke(); }
  }

  // Red gingham tablecloth along the bottom.
  const top = H * 0.8, sq = 44 * unit(W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = 'rgba(232,70,46,0.45)';
  for (let x = 0; x < W; x += sq * 2) ctx.fillRect(x, top, sq, H - top);
  for (let y = top; y < H; y += sq * 2) ctx.fillRect(0, y, W, sq);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, top, W, 8);

  // A pot on each side, gently steaming.
  [W * 0.08, W * 0.92].forEach((px, i) => drawPot(ctx, px, top + 6, 70 * unit(W, H), i ? BASIL : TOMATO));
}

function drawPot(ctx: CanvasRenderingContext2D, x: number, base: number, s: number, col: string): void {
  ctx.save();
  ctx.fillStyle = col;
  card(ctx, x - s, base - s * 1.1, s * 2, s * 1.1, s * 0.25, col);
  ctx.fillStyle = INK; ctx.fillRect(x - s * 1.15, base - s * 1.15, s * 2.3, s * 0.16);
  ctx.fillRect(x - s * 1.35, base - s * 0.9, s * 0.25, s * 0.12); ctx.fillRect(x + s * 1.1, base - s * 0.9, s * 0.25, s * 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(steamT * 2 + k);
    ctx.beginPath();
    for (let j = 0; j <= 10; j++) {
      const yy = base - s * 1.3 - j * s * 0.09;
      const xx = x + k * s * 0.5 + Math.sin(steamT * 3 + j * 0.6 + k) * s * 0.12;
      j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawChefHat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(x - s * 0.45, y - s * 0.15, s * 0.38, Math.PI * 0.6, Math.PI * 1.6);
  ctx.arc(x, y - s * 0.45, s * 0.45, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(x + s * 0.45, y - s * 0.15, s * 0.38, Math.PI * 1.4, Math.PI * 0.4);
  ctx.lineTo(x + s * 0.4, y + s * 0.45); ctx.lineTo(x - s * 0.4, y + s * 0.45); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.4, y + s * 0.22); ctx.lineTo(x + s * 0.4, y + s * 0.22); ctx.stroke();
  ctx.restore();
}

export function drawTitle(ctx: CanvasRenderingContext2D, W: number, H: number, y: number, sub?: string): void {
  const u = unit(W, H);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font(104 * u, 900);
  const tw = ctx.measureText('Cooking Chef').width;
  drawChefHat(ctx, W / 2 - tw / 2 - 70 * u, y - 6 * u, 70 * u);
  ctx.lineWidth = 14 * u; ctx.strokeStyle = CREAM; ctx.lineJoin = 'round';
  ctx.strokeText('Cooking Chef', W / 2, y);
  ctx.fillStyle = TOMATO; ctx.fillText('Cooking Chef', W / 2, y);
  if (sub) {
    ctx.font = font(36 * u, 700); ctx.fillStyle = INK;
    ctx.fillText(sub, W / 2, y + 86 * u);
  }
  ctx.restore();
}

export function recipeCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, edge = 'rgba(59,35,20,0.25)', fill = CREAM): void {
  card(ctx, x + 6 * u, y + 10 * u, w, h, 26 * u, 'rgba(59,35,20,0.18)');
  card(ctx, x, y, w, h, 26 * u, fill, edge, 4 * u);
}

// A dwell button: fills from the left while the hand rests on it.
export function dwellButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, label: string, col: string, hover: boolean, p: number): void {
  ctx.save();
  recipeCard(ctx, x, y, w, h, u, hover ? col : 'rgba(59,35,20,0.3)', hover ? '#fff' : CREAM);
  if (p > 0) {
    ctx.save();
    ctx.beginPath(); (ctx as unknown as { roundRect(x: number, y: number, w: number, h: number, r: number): void }).roundRect(x, y, w, h, 26 * u); ctx.clip();
    ctx.globalAlpha = 0.3; ctx.fillStyle = col; ctx.fillRect(x, y, w * p, h);
    ctx.restore();
  }
  ctx.font = font(44 * u, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = hover ? col : INK; ctx.fillText(label, x + w / 2, y + h / 2 + 2 * u);
  ctx.restore();
}

export type IconName = 'play' | 'endless' | 'daily' | 'party' | 'howto' | 'settings' | 'trophy' | 'exit' | 'hand' | 'pinch' | 'hold';

export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, x: number, y: number, s: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const r = s / 2;
  switch (name) {
    case 'play':
      ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.8); ctx.lineTo(r * 0.85, 0); ctx.lineTo(-r * 0.55, r * 0.8); ctx.closePath(); ctx.fill(); break;
    case 'endless':
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.1) {
        const d = 1 + Math.sin(t) ** 2;
        const px = r * Math.cos(t) / d, py = r * Math.sin(t) * Math.cos(t) / d * 1.2;
        t ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke(); break;
    case 'daily':
      card(ctx, -r * 0.8, -r * 0.6, r * 1.6, r * 1.4, r * 0.2, null, col, s * 0.1);
      ctx.fillRect(-r * 0.8, -r * 0.6, r * 1.6, r * 0.35);
      ctx.fillRect(-r * 0.5, -r * 0.85, r * 0.15, r * 0.4); ctx.fillRect(r * 0.35, -r * 0.85, r * 0.15, r * 0.4);
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill(); break;
    case 'party':
      [[-r * 0.45, 0.8], [r * 0.45, 0.8], [0, 1]].forEach(([px, k]) => {
        ctx.beginPath(); ctx.arc(px, -r * 0.35 * k, r * 0.26 * k, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px, r * 0.75, r * 0.48 * k, Math.PI, 0); ctx.fill();
      }); break;
    case 'howto':
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.quadraticCurveTo(-r * 0.5, -r * 0.8, -r * 0.9, -r * 0.6); ctx.lineTo(-r * 0.9, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.4, 0, r * 0.7); ctx.quadraticCurveTo(r * 0.5, r * 0.4, r * 0.9, r * 0.6); ctx.lineTo(r * 0.9, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.8, 0, -r * 0.5); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.7); ctx.stroke(); break;
    case 'settings':
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-r * 0.14, -r * 0.9, r * 0.28, r * 0.4); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.fill(); break;
    case 'trophy':
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.lineTo(r * 0.6, -r * 0.8); ctx.quadraticCurveTo(r * 0.6, r * 0.2, 0, r * 0.25); ctx.quadraticCurveTo(-r * 0.6, r * 0.2, -r * 0.6, -r * 0.8); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.6, -r * 0.4, r * 0.28, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(r * 0.6, -r * 0.4, r * 0.28, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();
      ctx.fillRect(-r * 0.1, r * 0.2, r * 0.2, r * 0.4); ctx.fillRect(-r * 0.45, r * 0.6, r * 0.9, r * 0.22); break;
    case 'exit':
      ctx.beginPath(); ctx.moveTo(r * 0.8, 0); ctx.lineTo(-r * 0.7, 0); ctx.moveTo(-r * 0.2, -r * 0.55); ctx.lineTo(-r * 0.75, 0); ctx.lineTo(-r * 0.2, r * 0.55); ctx.stroke(); break;
    case 'hand':
    case 'pinch':
    case 'hold': {
      // Palm with four fingers; pinch curls the index onto the thumb.
      ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.5, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = s * 0.16;
      [-0.3, 0, 0.3].forEach((dx, i) => { ctx.beginPath(); ctx.moveTo(r * (dx + 0.08), r * 0.1); ctx.lineTo(r * (dx + 0.08), -r * (0.75 - Math.abs(i - 1) * 0.08)); ctx.stroke(); });
      if (name === 'pinch') {
        ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.05); ctx.quadraticCurveTo(-r * 0.4, -r * 0.45, -r * 0.62, -r * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.45); ctx.lineTo(-r * 0.68, -r * 0.08); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-r * 0.28, r * 0.1); ctx.lineTo(-r * 0.28, -r * 0.62); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.45); ctx.lineTo(-r * 0.85, r * 0.05); ctx.stroke();
      }
      if (name === 'hold') {
        ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, -Math.PI / 2, Math.PI * 0.9); ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}
