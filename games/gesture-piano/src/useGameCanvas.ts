import { useCallback } from 'react';
import type { GameState } from './gameLogic';
import {
  CANVAS_W, CANVAS_H, HIT_LINE_Y, KEY_TOP_Y, KEY_H,
  NUM_KEYS, KEY_NAMES, KEY_COLORS, fallDurationMs, accuracy,
} from './gameLogic';

interface Point { x: number; y: number; }

interface DrawOptions {
  state:       GameState;
  fingertips:  Point[];
  pressedKeys: Set<number>;
  videoEl:     HTMLVideoElement | null;
}

const KEY_W = CANVAS_W / NUM_KEYS; // 96 px per key
const BAR_W = KEY_W - 10;          // falling bar width
const BAR_H = 22;                  // falling bar height

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const draw = useCallback((opts: DrawOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { state, fingertips, pressedKeys, videoEl } = opts;
    const fallMs = fallDurationMs(state.mode);
    const now    = performance.now();

    // ── Background ─────────────────────────────────────────────────────────────
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle vertical lane dividers
    for (let i = 1; i < NUM_KEYS; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * KEY_W, 0);
      ctx.lineTo(i * KEY_W, KEY_TOP_Y);
      ctx.stroke();
    }

    // Per-key lane tint
    for (let i = 0; i < NUM_KEYS; i++) {
      ctx.fillStyle = hexToRgba(KEY_COLORS[i], 0.035);
      ctx.fillRect(i * KEY_W, 0, KEY_W, KEY_TOP_Y);
    }

    // ── Falling note bars ───────────────────────────────────────────────────────
    if (state.mode !== 'freeplay') {
      for (const note of state.notes) {
        if (note.hit === 'miss') continue;

        const msUntilHit = note.time - state.songTime;
        if (msUntilHit > fallMs || msUntilHit < -BAR_H * 2) continue;

        const progress = 1 - msUntilHit / fallMs; // 0 = top, 1 = hit line
        const barY = progress * HIT_LINE_Y - BAR_H / 2;
        const barX = note.keyIndex * KEY_W + (KEY_W - BAR_W) / 2;
        const color  = KEY_COLORS[note.keyIndex];
        const isNear = Math.abs(msUntilHit) < 80;

        if (isNear) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur  = 18;
        }

        const alpha = note.hit !== 'none' ? 0.25 : Math.min(1, 0.3 + progress * 0.7);
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = color;
        roundRect(ctx, barX, barY, BAR_W, BAR_H, 5);
        ctx.fill();

        // Bright leading edge
        ctx.globalAlpha = alpha * 1.5;
        ctx.fillStyle   = '#ffffff';
        roundRect(ctx, barX, barY, BAR_W, 3, 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        if (isNear) ctx.restore();
      }
    }

    // ── Hit line ────────────────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.50)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, HIT_LINE_Y);
    ctx.lineTo(CANVAS_W, HIT_LINE_Y);
    ctx.stroke();
    ctx.restore();

    // ── Piano keys ─────────────────────────────────────────────────────────────
    for (let i = 0; i < NUM_KEYS; i++) {
      const x     = i * KEY_W;
      const color = KEY_COLORS[i];
      const isDown = pressedKeys.has(i);

      ctx.fillStyle = isDown
        ? hexToRgba(color, 0.75)
        : hexToRgba(color, 0.14);
      roundRect(ctx, x + 2, KEY_TOP_Y + 2, KEY_W - 4, KEY_H - 4, 6);
      ctx.fill();

      if (isDown) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur  = 22;
      }
      ctx.strokeStyle = isDown ? color : hexToRgba(color, 0.45);
      ctx.lineWidth   = isDown ? 2.5 : 1.5;
      roundRect(ctx, x + 2, KEY_TOP_Y + 2, KEY_W - 4, KEY_H - 4, 6);
      ctx.stroke();
      if (isDown) ctx.restore();

      ctx.fillStyle    = isDown ? '#ffffff' : hexToRgba(color, 0.7);
      ctx.font         = `bold ${Math.round(KEY_W * 0.20)}px system-ui, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(KEY_NAMES[i], x + KEY_W / 2, KEY_TOP_Y + KEY_H * 0.55);
    }

    // ── Fingertip cursors ───────────────────────────────────────────────────────
    for (const ft of fingertips) {
      const cx = ft.x * CANVAS_W;
      const cy = ft.y * CANVAS_H;
      const ki = Math.min(NUM_KEYS - 1, Math.max(0, Math.floor(ft.x * NUM_KEYS)));
      const color = KEY_COLORS[ki];

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur  = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = hexToRgba(color, 0.35);
      ctx.fill();
      ctx.restore();
    }

    // ── Hit feedback text ───────────────────────────────────────────────────────
    if (state.hitFeedback) {
      const age  = now - state.hitFeedback.timestamp;
      const a    = Math.max(0, 1 - age / 650);
      const rise = (age / 650) * 28;
      const ki   = state.hitFeedback.keyIndex;
      const fx   = ki * KEY_W + KEY_W / 2;
      const fy   = HIT_LINE_Y - 30 - rise;

      ctx.save();
      ctx.globalAlpha  = a;
      ctx.shadowColor  = state.hitFeedback.color;
      ctx.shadowBlur   = 16;
      ctx.fillStyle    = state.hitFeedback.color;
      ctx.font         = 'bold 20px system-ui, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.hitFeedback.text, fx, fy);
      ctx.restore();
    }

    // ── Song progress bar (very top) ────────────────────────────────────────────
    if (state.mode !== 'freeplay') {
      const p = Math.min(1, state.songTime / state.songDuration);
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillRect(0, 0, CANVAS_W, 4);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(0, 0, CANVAS_W * p, 4);
    }

    // ── HUD ────────────────────────────────────────────────────────────────────
    drawHUD(ctx, state);

    // ── Webcam thumbnail ────────────────────────────────────────────────────────
    if (videoEl && videoEl.readyState >= 2) {
      const VW = 128;
      const VH = 96;
      const VX = CANVAS_W - VW - 6;
      const VY = HIT_LINE_Y - VH - 10;

      ctx.save();
      ctx.translate(VX + VW, VY);
      ctx.scale(-1, 1);
      roundRect(ctx, 0, 0, VW, VH, 5);
      ctx.clip();
      ctx.drawImage(videoEl, 0, 0, VW, VH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 1.5;
      roundRect(ctx, VX, VY, VW, VH, 5);
      ctx.stroke();
    }
  }, [canvasRef]);

  return draw;
}

// ── HUD ───────────────────────────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  roundRect(ctx, 8, 8, 130, 62, 8);
  ctx.fill();

  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 28px system-ui, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state.score), 18, 13);

  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font      = '11px system-ui, sans-serif';
  ctx.fillText('SCORE', 18, 46);

  if (state.combo > 1) {
    ctx.fillStyle = '#fde047';
    ctx.font      = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`×${state.combo} COMBO`, 18, 58);
  }

  const modeLabel = state.mode === 'freeplay' ? 'FREE PLAY'
    : state.mode === 'easy'   ? 'EASY – Twinkle Twinkle'
    : state.mode === 'medium' ? 'MEDIUM – Ode to Joy'
    :                           'HARD – Für Elise';

  ctx.fillStyle    = 'rgba(255,255,255,0.28)';
  ctx.font         = '10px system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(modeLabel, CANVAS_W / 2, 8);

  if (state.mode !== 'freeplay') {
    const acc = accuracy(state);
    ctx.fillStyle = acc >= 90 ? '#22c55e' : acc >= 70 ? '#eab308' : '#ef4444';
    ctx.font      = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${acc}% ACC`, CANVAS_W - 8, 8);
  }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
