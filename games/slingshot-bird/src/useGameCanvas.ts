import { useCallback } from 'react';
import { CANVAS_W, CANVAS_H, GROUND_Y, SLING, getTrajectory } from './gameLogic';
import type { GameState, Entity } from './gameLogic';

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const draw = useCallback((state: GameState, videoEl: HTMLVideoElement | null, pinchX: number, pinchY: number, handDetected: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Sky gradient ──────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#4FC3F7');
    sky.addColorStop(1, '#B3E5FC');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Clouds ────────────────────────────────────────────────────────────────
    drawCloud(ctx, 120, 70, 70);
    drawCloud(ctx, 340, 45, 90);
    drawCloud(ctx, 600, 80, 60);

    // ── Background hills ──────────────────────────────────────────────────────
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    ctx.ellipse(200, GROUND_Y + 10, 180, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(620, GROUND_Y + 10, 220, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Ground ────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#5D8A52';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 8);

    // ── Slingshot ─────────────────────────────────────────────────────────────
    drawSlingshot(ctx);

    // ── Elastic bands (when pulling) ──────────────────────────────────────────
    if ((state.phase === 'aiming' || state.phase === 'pulling') && state.bird.state === 'ready') {
      const bx = state.bird.x;
      const by = state.bird.y;
      ctx.strokeStyle = '#7B4F2E';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      // Back band (behind bird)
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(SLING.forkRX, SLING.forkRY);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Front band
      ctx.beginPath();
      ctx.moveTo(SLING.forkLX, SLING.forkLY);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // ── Trajectory dots ───────────────────────────────────────────────────────
    if (state.phase === 'pulling' && state.pull) {
      const dots = getTrajectory(state.pull.x, state.pull.y);
      dots.forEach((p, i) => {
        if (i % 2 !== 0) return; // every other dot
        const alpha = 1 - i / dots.length;
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 - i * 0.08, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // ── Entities (blocks + pigs) ──────────────────────────────────────────────
    for (const e of state.entities) {
      if (e.dead) continue;
      drawEntity(ctx, e);
    }

    // ── Bird ──────────────────────────────────────────────────────────────────
    if (state.bird.state !== 'stopped') {
      drawBird(ctx, state.bird.x, state.bird.y, state.bird.radius);
    }

    // ── Bird queue (remaining birds) ──────────────────────────────────────────
    for (let i = 0; i < state.birdsLeft; i++) {
      const qx = 30 + i * 28;
      const qy = GROUND_Y + 28;
      ctx.globalAlpha = 0.75;
      drawBird(ctx, qx, qy, 11);
      ctx.globalAlpha = 1;
    }

    // ── Particles ─────────────────────────────────────────────────────────────
    for (const p of state.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Grab zone indicator (aiming phase) ───────────────────────────────────
    if (state.phase === 'aiming') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(SLING.anchorX, SLING.anchorY, SLING.grabRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('pinch here', SLING.anchorX, SLING.anchorY + SLING.grabRadius + 14);
    }

    // ── Hand cursor ───────────────────────────────────────────────────────────
    if (handDetected) {
      const cx = pinchX * CANVAS_W;
      const cy = pinchY * CANVAS_H;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }

    // ── HUD ───────────────────────────────────────────────────────────────────
    drawHUD(ctx, state);

    // ── Webcam thumbnail ──────────────────────────────────────────────────────
    if (videoEl && videoEl.readyState >= 2) {
      const VW = 130, VH = 98, VX = CANVAS_W - VW - 6, VY = 6;
      ctx.save();
      ctx.translate(VX + VW, VY);
      ctx.scale(-1, 1);
      roundRect(ctx, 0, 0, VW, VH, 5); ctx.clip();
      ctx.drawImage(videoEl, 0, 0, VW, VH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      roundRect(ctx, VX, VY, VW, VH, 5); ctx.stroke();
      ctx.fillStyle = handDetected ? '#4ade80' : '#ef4444';
      ctx.beginPath(); ctx.arc(VX + 9, VY + 9, 4, 0, Math.PI * 2); ctx.fill();
    }
  }, [canvasRef]);

  return draw;
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function drawSlingshot(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#5D3A1A';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Stem
  ctx.beginPath();
  ctx.moveTo(SLING.anchorX, GROUND_Y);
  ctx.lineTo(SLING.anchorX, SLING.anchorY + 10);
  ctx.stroke();
  // Left fork
  ctx.beginPath();
  ctx.moveTo(SLING.anchorX, SLING.anchorY + 10);
  ctx.lineTo(SLING.forkLX, SLING.forkLY);
  ctx.stroke();
  // Right fork
  ctx.beginPath();
  ctx.moveTo(SLING.anchorX, SLING.anchorY + 10);
  ctx.lineTo(SLING.forkRX, SLING.forkRY);
  ctx.stroke();
  // Fork tips (knobs)
  ctx.fillStyle = '#3E2200';
  ctx.beginPath(); ctx.arc(SLING.forkLX, SLING.forkLY, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(SLING.forkRX, SLING.forkRY, 6, 0, Math.PI * 2); ctx.fill();
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Body
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();

  // Tuft on top
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.88);
  ctx.lineTo(x + r * 0.12, y - r * 0.68);
  ctx.lineTo(x + r * 0.28, y - r * 0.9);
  ctx.lineTo(x + r * 0.14, y - r * 0.65);
  ctx.closePath(); ctx.fill();

  if (r < 10) return; // skip face for small queue birds

  // Eye white
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(x + r * 0.22, y - r * 0.15, r * 0.3, r * 0.24, 0.3, 0, Math.PI * 2); ctx.fill();
  // Pupil
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
  // Angry brow
  ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = r * 0.13;
  ctx.beginPath(); ctx.moveTo(x + r * 0.02, y - r * 0.38); ctx.lineTo(x + r * 0.52, y - r * 0.22); ctx.stroke();
  // Beak
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y); ctx.lineTo(x + r * 0.92, y - r * 0.1); ctx.lineTo(x + r * 0.92, y + r * 0.12); ctx.closePath(); ctx.fill();
}

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity) {
  switch (e.type) {
    case 'wood':  drawWood(ctx, e); break;
    case 'stone': drawStone(ctx, e); break;
    case 'glass': drawGlass(ctx, e); break;
    case 'pig':   drawPig(ctx, e); break;
  }
}

function drawWood(ctx: CanvasRenderingContext2D, e: Entity) {
  ctx.fillStyle = '#8B5E3C';
  roundRect(ctx, e.x, e.y, e.w, e.h, 3); ctx.fill();
  ctx.strokeStyle = '#5D3A1A'; ctx.lineWidth = 2;
  roundRect(ctx, e.x, e.y, e.w, e.h, 3); ctx.stroke();
  // Grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  for (let i = 1; i < Math.floor(e.h / 12); i++) {
    ctx.beginPath();
    ctx.moveTo(e.x + 3, e.y + i * 12);
    ctx.lineTo(e.x + e.w - 3, e.y + i * 12);
    ctx.stroke();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, e: Entity) {
  ctx.fillStyle = '#9E9E9E';
  roundRect(ctx, e.x, e.y, e.w, e.h, 4); ctx.fill();
  ctx.strokeStyle = '#616161'; ctx.lineWidth = 2;
  roundRect(ctx, e.x, e.y, e.w, e.h, 4); ctx.stroke();
  // Stone texture dots
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.arc(e.x + e.w * 0.3, e.y + e.h * 0.35, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.x + e.w * 0.7, e.y + e.h * 0.6, 4, 0, Math.PI * 2); ctx.fill();
  // HP crack if damaged
  if (e.hp < e.maxHp) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.x + e.w * 0.5, e.y + e.h * 0.2);
    ctx.lineTo(e.x + e.w * 0.4, e.y + e.h * 0.55);
    ctx.lineTo(e.x + e.w * 0.6, e.y + e.h * 0.8);
    ctx.stroke();
  }
}

function drawGlass(ctx: CanvasRenderingContext2D, e: Entity) {
  ctx.fillStyle = 'rgba(160,216,239,0.45)';
  roundRect(ctx, e.x, e.y, e.w, e.h, 3); ctx.fill();
  ctx.strokeStyle = '#29B6F6'; ctx.lineWidth = 2;
  roundRect(ctx, e.x, e.y, e.w, e.h, 3); ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  roundRect(ctx, e.x + 3, e.y + 3, e.w * 0.3, e.h * 0.35, 2); ctx.fill();
}

function drawPig(ctx: CanvasRenderingContext2D, e: Entity) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const r = Math.min(e.w, e.h) / 2 - 2;

  // Body
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2; ctx.stroke();

  // Snout
  ctx.fillStyle = '#66BB6A';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.22, r * 0.36, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#388E3C'; ctx.lineWidth = 1; ctx.stroke();
  // Nostrils
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath(); ctx.arc(cx - r * 0.13, cy + r * 0.22, r * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.13, cy + r * 0.22, r * 0.08, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.2, r * 0.19, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.32, cy - r * 0.2, r * 0.19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.18, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.18, r * 0.1, 0, Math.PI * 2); ctx.fill();

  // Ears
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.72, cy - r * 0.62, r * 0.2, r * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.72, cy - r * 0.62, r * 0.2, r * 0.28, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2E7D32'; ctx.stroke();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // Score box
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 6, 6, 130, 56, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state.score), 14, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px system-ui';
  ctx.fillText('SCORE', 14, 38);

  // Level badge
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 6, 68, 130, 28, 6); ctx.fill();
  ctx.fillStyle = '#FDD835';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText(`LEVEL ${(state.level % 4) + 1}`, 14, 74);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.5, y + r * 0.1, r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.45, y + r * 0.12, r * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.35, r * 0.42, 0, Math.PI * 2); ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
