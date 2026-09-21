import { useCallback } from 'react';
import type { GameState, VolleyGestureInput } from './gameLogic';
import {
  CANVAS_W, CANVAS_H, GROUND_Y, NET_X, NET_TOP_Y, NET_W,
  BALL_R, AVATAR_H, HEAD_R, HIT_RADIUS, HIT_CENTRE_Y_OFF,
  POINT_PAUSE_MS,
} from './gameLogic';

export interface DrawPayload {
  state:   GameState;
  videoEl: HTMLVideoElement | null;
  gesture: VolleyGestureInput;
}

// ── Court ─────────────────────────────────────────────────────────────────────

function drawCourt(ctx: CanvasRenderingContext2D) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#0a1f3d');
  sky.addColorStop(1, '#1a4a7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Sand / floor
  const sand = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  sand.addColorStop(0, '#c9a227');
  sand.addColorStop(1, '#8b6411');
  ctx.fillStyle = sand;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Ground line
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(20, GROUND_Y);
  ctx.lineTo(CANVAS_W - 20, GROUND_Y);
  ctx.stroke();

  // Outer court boundary ticks
  [[20, 0], [CANVAS_W - 20, 0]].forEach(([x]) => {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x, GROUND_Y - 6);
    ctx.stroke();
  });
}

// ── Net ───────────────────────────────────────────────────────────────────────

function drawNet(ctx: CanvasRenderingContext2D) {
  const x = NET_X;

  // Net body (mesh colour)
  ctx.fillStyle = 'rgba(180,200,220,0.65)';
  ctx.fillRect(x - NET_W / 2, NET_TOP_Y, NET_W, GROUND_Y - NET_TOP_Y);

  // Horizontal mesh lines
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth   = 1;
  for (let y = NET_TOP_Y + 14; y < GROUND_Y; y += 18) {
    ctx.beginPath();
    ctx.moveTo(x - NET_W / 2, y);
    ctx.lineTo(x + NET_W / 2, y);
    ctx.stroke();
  }

  // Top white tape
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(x - NET_W / 2 - 2, NET_TOP_Y - 6, NET_W + 4, 8);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function drawAvatar(
  ctx:        CanvasRenderingContext2D,
  x:          number,
  bodyColor:  string,
  rimColor:   string,
  isBlocking: boolean,
  isSmashing: boolean,
) {
  const footY     = GROUND_Y;
  const headY     = footY - AVATAR_H + HEAD_R;
  const bodyTopY  = headY + HEAD_R + 2;
  const bodyBotY  = footY - 22;
  const shoulderY = bodyTopY + 7;
  const waistY    = bodyBotY - 2;

  ctx.lineCap = 'round';

  // Shadow ellipse
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, footY + 3, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth   = 7;
  ctx.beginPath(); ctx.moveTo(x - 5, waistY); ctx.lineTo(x - 9, footY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5, waistY); ctx.lineTo(x + 9, footY); ctx.stroke();

  // Body
  ctx.fillStyle   = bodyColor;
  ctx.strokeStyle = rimColor;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 10, bodyTopY, 20, bodyBotY - bodyTopY, 3);
  ctx.fill();
  ctx.stroke();

  // Arms — shape changes with gesture
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth   = 6;
  if (isBlocking) {
    // Both arms wide spread
    ctx.beginPath(); ctx.moveTo(x - 10, shoulderY + 4); ctx.lineTo(x - 46, shoulderY - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, shoulderY + 4); ctx.lineTo(x + 46, shoulderY - 8); ctx.stroke();
  } else if (isSmashing) {
    // One arm raised for attack
    ctx.beginPath(); ctx.moveTo(x - 10, shoulderY + 4); ctx.lineTo(x - 22, shoulderY + 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, shoulderY + 4); ctx.lineTo(x + 28, headY - 18);    ctx.stroke();
  } else {
    // Relaxed ready stance
    ctx.beginPath(); ctx.moveTo(x - 10, shoulderY + 4); ctx.lineTo(x - 26, shoulderY + 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, shoulderY + 4); ctx.lineTo(x + 26, shoulderY + 24); ctx.stroke();
  }

  // Head
  ctx.fillStyle   = bodyColor;
  ctx.strokeStyle = rimColor;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(x, headY, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(x - 4, headY - 4, HEAD_R * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

// ── Ball ──────────────────────────────────────────────────────────────────────

function drawBall(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Dynamic shadow (shrinks as ball rises)
  const t = Math.min(Math.max((by - 40) / (GROUND_Y - 40), 0), 1);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * t})`;
  ctx.beginPath();
  ctx.ellipse(bx, GROUND_Y + 3, 18 * t, 5 * t, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball body gradient
  const g = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, BALL_R);
  g.addColorStop(0,   '#fffef4');
  g.addColorStop(0.6, '#fefae0');
  g.addColorStop(1,   '#ddb82e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Rim
  ctx.strokeStyle = 'rgba(170,130,20,0.35)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Volleyball panel lines
  ctx.strokeStyle = 'rgba(70,50,5,0.22)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(bx - BALL_R, by); ctx.lineTo(bx + BALL_R, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, by - BALL_R); ctx.lineTo(bx, by + BALL_R); ctx.stroke();
  // Left arc
  ctx.beginPath();
  ctx.arc(bx - BALL_R * 0.28, by, BALL_R * 0.92, -Math.PI / 2.8, Math.PI / 2.8);
  ctx.stroke();
  // Right arc
  ctx.beginPath();
  ctx.arc(bx + BALL_R * 0.28, by, BALL_R * 0.92, Math.PI - Math.PI / 2.8, Math.PI + Math.PI / 2.8);
  ctx.stroke();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.beginPath();
  ctx.arc(bx - 5, by - 5, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ── Gesture status indicators ─────────────────────────────────────────────────

function drawGestureIndicators(
  ctx:     CanvasRenderingContext2D,
  px:      number,
  gesture: VolleyGestureInput,
) {
  const hcy = GROUND_Y - AVATAR_H + HIT_CENTRE_Y_OFF;

  // Subtle dashed hit-zone ring around player
  ctx.strokeStyle  = gesture.isBlocking
    ? 'rgba(96,165,250,0.20)'
    : 'rgba(250,204,21,0.12)';
  ctx.lineWidth    = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(px, hcy, HIT_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Status badge above avatar
  const badgeY = GROUND_Y - AVATAR_H - 14;
  if (gesture.isBlocking) {
    ctx.fillStyle = 'rgba(96,165,250,0.85)';
    ctx.font      = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🛡 BLOCK', px, badgeY);
  } else if (gesture.highestHandY < 0.36) {
    ctx.fillStyle = 'rgba(250,204,21,0.90)';
    ctx.font      = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ SMASH', px, badgeY);
  }
}

// ── Point announcement ────────────────────────────────────────────────────────

function drawPointBanner(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.phase !== 'point_player' && state.phase !== 'point_ai') return;
  const isPlayer = state.phase === 'point_player';
  const progress = 1 - state.pointTimer / POINT_PAUSE_MS;
  const alpha    = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;

  ctx.save();
  ctx.globalAlpha  = alpha;
  ctx.fillStyle    = isPlayer ? '#4ade80' : '#f87171';
  ctx.font         = 'bold 52px system-ui';
  ctx.textAlign    = 'center';
  ctx.shadowColor  = isPlayer ? '#14532d' : '#7f1d1d';
  ctx.shadowBlur   = 22;
  ctx.fillText(isPlayer ? '🏐 POINT!' : 'AI SCORES!', CANVAS_W / 2, CANVAS_H / 2 - 10);
  ctx.shadowBlur   = 0;
  ctx.restore();
}

// ── Serve countdown ───────────────────────────────────────────────────────────

function drawServeHint(ctx: CanvasRenderingContext2D, state: GameState) {
  const isPlayerServe = state.phase === 'serving_player';
  const isAIServe     = state.phase === 'serving_ai';
  if (!isPlayerServe && !isAIServe) return;

  const secLeft = Math.ceil(state.serveTimer / 1000);
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.font      = '13px system-ui';
  ctx.textAlign = 'center';

  if (isPlayerServe) {
    ctx.fillText(`Serve in ${secLeft}s  –  raise hand to smash-serve!`, CANVAS_W / 4, GROUND_Y - 18);
  } else {
    ctx.fillText(`AI serves in ${secLeft}s`, (CANVAS_W * 3) / 4, GROUND_Y - 18);
  }
}

// ── Webcam thumbnail ──────────────────────────────────────────────────────────

function drawWebcam(ctx: CanvasRenderingContext2D, videoEl: HTMLVideoElement | null) {
  if (!videoEl || videoEl.readyState < 2) return;
  const TW = 90, TH = 68;
  const tx = CANVAS_W - TW - 6;
  const ty = CANVAS_H - TH - 6;
  ctx.save();
  ctx.translate(tx + TW / 2, ty + TH / 2);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, -TW / 2, -TH / 2, TW, TH);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(tx, ty, TW, TH);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  return useCallback(({ state, videoEl, gesture }: DrawPayload) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawCourt(ctx);

    // Hit zone indicator (under avatars)
    if (state.phase === 'playing' || state.phase === 'serving_player') {
      drawGestureIndicators(ctx, state.player.x, gesture);
    }

    drawNet(ctx);

    // AI avatar
    drawAvatar(ctx, state.ai.x, '#f87171', '#7f1d1d', false, state.ai.isSmashing);

    // Player avatar — uses live gesture for arm pose
    drawAvatar(ctx, state.player.x, '#7dd3fc', '#0369a1',
      state.player.isBlocking, gesture.isSmashing || gesture.highestHandY < 0.32);

    // Ball
    drawBall(ctx, state.ball.x, state.ball.y);

    // Overlays
    drawServeHint(ctx, state);
    drawPointBanner(ctx, state);

    // Webcam thumbnail
    drawWebcam(ctx, videoEl);
  }, [canvasRef]);
}
