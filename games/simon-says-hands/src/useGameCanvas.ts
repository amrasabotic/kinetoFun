import { useRef, useCallback } from 'react';
import { PANELS, CANVAS_W, CANVAS_H } from './gameLogic';
import type { GameState } from './gameLogic';

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const frameRef = useRef(0);

  const draw = useCallback((
    gs: GameState,
    videoEl: HTMLVideoElement | null,
    handX: number, handY: number,
    handDetected: boolean,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const isSuccess = gs.phase === 'success';
    const isFail = gs.phase === 'fail';

    // Draw panels
    for (const panel of PANELS) {
      const isLit = gs.litPanel === panel.id;
      const isSlapFlash = gs.slapFlash === panel.id;
      const isSuccessFlash = isSuccess;
      const isFailFlash = isFail;

      // Determine color + glow
      let color = panel.dimColor;
      let glowColor = panel.color;
      let glowRadius = 0;

      if (isSuccessFlash) {
        // All panels pulse green
        const t = 1 - gs.phaseTimer / 900;
        const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
        color = blendHex('#052e16', '#22c55e', pulse * 0.85 + 0.15);
        glowColor = '#22c55e';
        glowRadius = 40 * pulse;
      } else if (isFailFlash) {
        // All panels pulse red
        const t = 1 - gs.phaseTimer / 1100;
        const pulse = Math.sin(t * Math.PI * 2.5) * 0.5 + 0.5;
        color = blendHex('#450a0a', '#ef4444', pulse * 0.8 + 0.2);
        glowColor = '#ef4444';
        glowRadius = 35 * pulse;
      } else if (isLit || isSlapFlash) {
        color = panel.color;
        glowColor = panel.color;
        glowRadius = isSlapFlash ? 55 : 45;
      }

      // Glow
      if (glowRadius > 0) {
        const cx = panel.x + panel.w / 2;
        const cy = panel.y + panel.h / 2;
        const grd = ctx.createRadialGradient(cx, cy, panel.w * 0.1, cx, cy, panel.w * 0.8);
        grd.addColorStop(0, hexWithAlpha(glowColor, 0.55));
        grd.addColorStop(1, hexWithAlpha(glowColor, 0));
        ctx.save();
        ctx.filter = `blur(${glowRadius * 0.4}px)`;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.roundRect(panel.x - 20, panel.y - 20, panel.w + 40, panel.h + 40, 24);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
      }

      // Panel body
      ctx.save();
      ctx.shadowColor = (isLit || isSlapFlash) ? panel.color : 'transparent';
      ctx.shadowBlur = (isLit || isSlapFlash) ? 30 : 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 18);
      ctx.fill();
      ctx.restore();

      // Border
      ctx.strokeStyle = isLit || isSlapFlash ? panel.color : `${panel.color}44`;
      ctx.lineWidth = isLit || isSlapFlash ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 18);
      ctx.stroke();

      // Label
      ctx.fillStyle = isLit || isSlapFlash || isSuccessFlash || isFailFlash
        ? '#ffffffcc' : '#ffffff33';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(panel.label, panel.x + panel.w / 2, panel.y + panel.h - 16);

      // Slap ripple
      if (isSlapFlash) {
        const progress = 1 - gs.slapFlashTimer / 280;
        const rippleR = progress * (panel.w * 0.5);
        ctx.strokeStyle = hexWithAlpha(panel.color, (1 - progress) * 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(panel.x + panel.w / 2, panel.y + panel.h / 2, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // HUD bar at bottom
    const hudY = CANVAS_H - 8;
    ctx.fillStyle = '#ffffff10';
    ctx.fillRect(0, hudY - 2, CANVAS_W, 10);

    // Input progress bar (during input phase)
    if (gs.phase === 'input' && gs.sequence.length > 0) {
      const pct = gs.inputStep / gs.sequence.length;
      ctx.fillStyle = '#6366f1cc';
      ctx.fillRect(0, hudY - 2, CANVAS_W * pct, 10);
    }

    // Round + score overlay (top bar)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, 36);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Round ${gs.round}  •  ${gs.sequence.length} steps`, 16, 18);
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${gs.score}`, CANVAS_W - 16, 18);

    // Phase label
    if (gs.phase === 'demo') {
      const pct = gs.demoLit ? 1 - gs.demoTimer / 600 : 0;
      ctx.fillStyle = `rgba(99,102,241,${0.5 + pct * 0.4})`;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Watch! Step ${gs.demoStep + 1} of ${gs.sequence.length}`,
        CANVAS_W / 2, CANVAS_H / 2,
      );
    } else if (gs.phase === 'input') {
      ctx.fillStyle = '#6ee7b7cc';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Your turn! Slap step ${gs.inputStep + 1}`,
        CANVAS_W / 2, CANVAS_H / 2,
      );
    }

    // Hand cursor
    if (handDetected) {
      const hx = handX * CANVAS_W;
      const hy = handY * CANVAS_H;
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.restore();
    }

    // Webcam thumbnail (bottom-right)
    if (videoEl && videoEl.readyState >= 2) {
      const tw = 120, th = 90;
      const tx = CANVAS_W - tw - 10;
      const ty = CANVAS_H - th - 10;
      ctx.save();
      ctx.translate(tx + tw, ty);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, tw, th);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    }

    frameRef.current++;
  }, [canvasRef]);

  return draw;
}

function blendHex(from: string, to: string, t: number): string {
  const f = parseInt(from.slice(1), 16);
  const g = parseInt(to.slice(1), 16);
  const r = Math.round(((f >> 16) & 0xff) * (1 - t) + ((g >> 16) & 0xff) * t);
  const gr = Math.round(((f >> 8) & 0xff) * (1 - t) + ((g >> 8) & 0xff) * t);
  const b = Math.round((f & 0xff) * (1 - t) + (g & 0xff) * t);
  return `rgb(${r},${gr},${b})`;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
