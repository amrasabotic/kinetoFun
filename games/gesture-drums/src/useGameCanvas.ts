import { useCallback } from 'react';
import type { GameState, BeatNote } from './gameLogic';
import { CANVAS_W, CANVAS_H } from './gameLogic';

// How far above the hit line a note starts falling (in canvas px)
const NOTE_TRAVEL_PX = CANVAS_H * 0.70;
// How many ms it takes a note to travel that distance
const NOTE_TRAVEL_MS = 1500;

interface DrawOptions {
  state: GameState;
  leftDetected: boolean;
  rightDetected: boolean;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  videoEl: HTMLVideoElement | null;
}

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const draw = useCallback((opts: DrawOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { state, leftDetected, rightDetected, leftX, leftY, rightX, rightY, videoEl } = opts;

    // ── Background ──────────────────────────────────────────────────────
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle center divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Hit line ─────────────────────────────────────────────────────────
    const hitLineY = CANVAS_H * 0.82;
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitLineY);
    ctx.lineTo(CANVAS_W, hitLineY);
    ctx.stroke();

    // ── Falling note bars (rhythm mode) ──────────────────────────────────
    if (state.mode !== 'freeplay') {
      for (const note of state.notes) {
        if (note.hit === 'miss') continue;

        const pad = state.pads.find(p => p.id === note.padId);
        if (!pad) continue;

        // How far through its travel is this note?
        const msUntilHit = note.time - state.songTime;
        if (msUntilHit > NOTE_TRAVEL_MS || msUntilHit < -200) continue;

        const progress = 1 - msUntilHit / NOTE_TRAVEL_MS; // 0 = top, 1 = hit line
        const noteY = hitLineY - NOTE_TRAVEL_PX + progress * NOTE_TRAVEL_PX;

        const padXMid = ((pad.xMin + pad.xMax) / 2) * CANVAS_W;
        const padW = (pad.xMax - pad.xMin) * CANVAS_W * 0.85;
        const noteH = 16;
        const noteX = padXMid - padW / 2;

        const alpha = note.hit !== 'none' ? 0.3 : Math.min(1, progress + 0.2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pad.color;
        roundRect(ctx, noteX, noteY - noteH / 2, padW, noteH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Drum pads ────────────────────────────────────────────────────────
    const now = performance.now();
    for (const pad of state.pads) {
      const x = pad.xMin * CANVAS_W;
      const y = pad.yMin * CANVAS_H;
      const w = (pad.xMax - pad.xMin) * CANVAS_W;
      const h = (pad.yMax - pad.yMin) * CANVAS_H;
      const r = 10;

      const timeSinceHit = now - pad.hitTime;
      const isActive = pad.hitTime > 0 && timeSinceHit < 150;
      const hitProgress = isActive ? timeSinceHit / 150 : 1; // 0 = just hit, 1 = resting

      // Glow effect on hit
      if (isActive) {
        ctx.save();
        ctx.shadowColor = pad.glow;
        ctx.shadowBlur = 30 * (1 - hitProgress);
      }

      // Pad fill
      const fillAlpha = isActive ? 0.75 - hitProgress * 0.55 : 0.12;
      ctx.fillStyle = hexToRgba(pad.color, fillAlpha);
      roundRect(ctx, x, y, w, h, r);
      ctx.fill();

      // Pad border
      const borderAlpha = isActive ? 1 : 0.45;
      ctx.strokeStyle = hexToRgba(pad.color, borderAlpha);
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      roundRect(ctx, x, y, w, h, r);
      ctx.stroke();

      if (isActive) ctx.restore();

      // Label
      ctx.fillStyle = isActive ? pad.glow : hexToRgba(pad.color, 0.65);
      ctx.font = `bold ${Math.round(w * 0.085)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad.label.toUpperCase(), x + w / 2, y + h / 2);

      // Hand indicator badge
      const badge = pad.hand === 'left' ? 'L' : 'R';
      ctx.fillStyle = hexToRgba(pad.color, 0.4);
      ctx.font = `bold ${Math.round(w * 0.065)}px system-ui, sans-serif`;
      ctx.fillText(badge, x + w / 2, y + h * 0.78);
    }

    // ── Hand cursors ─────────────────────────────────────────────────────
    drawHandCursor(ctx, leftDetected, leftX * CANVAS_W, leftY * CANVAS_H, '#06b6d4', 'L');
    drawHandCursor(ctx, rightDetected, rightX * CANVAS_W, rightY * CANVAS_H, '#a855f7', 'R');

    // ── Hit feedback text ─────────────────────────────────────────────────
    if (state.hitFeedback) {
      const age = now - state.hitFeedback.timestamp;
      const alpha = Math.max(0, 1 - age / 600);
      const scale = 1 + (1 - age / 600) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(CANVAS_W / 2, CANVAS_H * 0.30);
      ctx.scale(scale, scale);
      ctx.fillStyle = state.hitFeedback.color;
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = state.hitFeedback.color;
      ctx.shadowBlur = 20;
      ctx.fillText(state.hitFeedback.text, 0, 0);
      ctx.restore();
    }

    // ── HUD ───────────────────────────────────────────────────────────────
    drawHUD(ctx, state);

    // ── Webcam thumbnail ──────────────────────────────────────────────────
    if (videoEl && videoEl.readyState >= 2) {
      const VW = 148;
      const VH = 110;
      const VX = CANVAS_W - VW - 8;
      const VY = 8;
      ctx.save();
      ctx.translate(VX + VW, VY);
      ctx.scale(-1, 1); // mirror
      roundRect(ctx, 0, 0, VW, VH, 6);
      ctx.clip();
      ctx.drawImage(videoEl, 0, 0, VW, VH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, VX, VY, VW, VH, 6);
      ctx.stroke();

      // Hand detection dot
      const bothDetected = leftDetected && rightDetected;
      const anyDetected = leftDetected || rightDetected;
      ctx.fillStyle = bothDetected ? '#4ade80' : anyDetected ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.arc(VX + 10, VY + 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [canvasRef]);

  return draw;
}

function drawHandCursor(
  ctx: CanvasRenderingContext2D,
  detected: boolean,
  x: number,
  y: number,
  color: string,
  label: string
) {
  if (!detected) return;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = hexToRgba(color, 0.25);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // Score
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 8, 8, 140, 68, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state.score), 18, 14);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('SCORE', 18, 44);

  // Combo
  if (state.combo > 1) {
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`×${state.combo}`, 18, 58);
  }

  // Mode label
  if (state.mode !== 'freeplay') {
    // Progress bar
    const barW = CANVAS_W - 240;
    const barX = 120;
    const barY = 20;
    const barH = 6;
    const progress = Math.min(1, state.songTime / state.songDuration);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    roundRect(ctx, barX, barY, barW * progress, barH, 3);
    ctx.fill();

    // Accuracy
    const acc = state.totalNotes > 0
      ? Math.round((state.hitNotes / state.totalNotes) * 100)
      : 100;
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${acc}% accuracy`, CANVAS_W / 2, 34);
  }

  // Mode chip top-right (not overlapping webcam)
  const modeLabel = state.mode === 'freeplay' ? 'FREE PLAY'
    : state.mode === 'easy' ? 'EASY'
    : state.mode === 'medium' ? 'MEDIUM' : 'HARD';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(modeLabel, CANVAS_W - 170, 14);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
