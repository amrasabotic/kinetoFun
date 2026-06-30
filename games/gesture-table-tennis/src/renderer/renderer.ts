import { project, setCanvasSize, tableEdge } from './projection';
import { drawArenaBackground, drawCrowdReaction } from './arenas';
import type { GameState, Particle, Target } from '../types';
import type { HandData } from '../gestures/useMediaPipe';
import {
  TABLE_HALF_W, TABLE_HALF_L, NET_HEIGHT, NET_Y, NET_THICKNESS,
  BALL_RADIUS, PADDLE_W, PADDLE_H, PADDLE_THICKNESS, PLAYER_PADDLE_Z,
  PADDLE_SKINS, BALL_SKINS, TRAIL_SKINS, ARENAS,
} from '../constants/gameConfig';
import type { PaddleSkinId, BallSkinId, TrailId } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RenderOptions {
  paddleSkin: PaddleSkinId;
  ballSkin: BallSkinId;
  trail: TrailId;
}

interface TrailPoint { x: number; y: number; t: number; }

// ── Trail history ─────────────────────────────────────────────────────────────
const ballTrail: TrailPoint[] = [];

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  hand: HandData,
  opts: RenderOptions,
  time: number,
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  setCanvasSize(W, H);

  // Camera shake
  ctx.save();
  if (gs.cameraShake > 0) {
    const sx = (Math.random() - 0.5) * gs.cameraShake;
    const sy = (Math.random() - 0.5) * gs.cameraShake;
    ctx.translate(sx, sy);
  }

  // Clear
  ctx.clearRect(-10, -10, W + 20, H + 20);

  // Arena background
  drawArenaBackground(ctx, gs.arenaId, W, H, time);

  // Crowd reaction
  const excitement = Math.min(1, gs.rallyCount / 8);
  if (excitement > 0) drawCrowdReaction(ctx, W, H, excitement, time);

  // Perfect hit overlay
  if (gs.perfectHitFlash > 0) {
    ctx.fillStyle = `rgba(255,215,0,${gs.perfectHitFlash * 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Table
  drawTable(ctx, gs, time);

  // Targets (precision mode)
  if (gs.mode === 'precision') drawTargets(ctx, gs, time);

  // Ball trail
  if (gs.ball.isActive && opts.trail !== 'none') {
    const sp = project(gs.ball.pos.x, gs.ball.pos.y, gs.ball.pos.z, gs.tableMoveOffset);
    ballTrail.push({ x: sp.x, y: sp.y, t: time });
  }
  while (ballTrail.length > 0 && time - ballTrail[0].t > 0.35) ballTrail.shift();
  drawBallTrail(ctx, ballTrail, opts.trail, time);

  // AI paddle
  drawPaddle(ctx, gs.aiPaddle.pos.x, gs.aiPaddle.pos.y, gs.aiPaddle.pos.z, gs.aiPaddle.angle, opts.paddleSkin, 0.7, gs.tableMoveOffset);

  // Ball shadow
  if (gs.ball.isActive) {
    const shadow = project(gs.ball.pos.x, gs.ball.pos.y, 0, gs.tableMoveOffset);
    ctx.globalAlpha = 0.25 * Math.max(0, 1 - gs.ball.pos.z * 3);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, BALL_RADIUS * shadow.scale * 120 * 1.8, BALL_RADIUS * shadow.scale * 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ball
    drawBall(ctx, gs, opts.ballSkin, time);
  }

  // Player paddle
  drawPaddle(ctx, gs.playerPaddle.pos.x, gs.playerPaddle.pos.y, gs.playerPaddle.pos.z, gs.playerPaddle.angle, opts.paddleSkin, 1.0, gs.tableMoveOffset);

  // Power shot aura
  if (gs.isChargingPower && gs.powerShotCharge > 0.3) {
    drawPowerAura(ctx, gs, time);
  }

  // Particles
  drawParticles(ctx, gs.particles);

  // Score events
  drawScoreEvents(ctx, gs);

  // Hand silhouette overlay
  drawHandSilhouette(ctx, hand, W, H);

  // HUD (Phase-specific overlays)
  if (gs.phase === 'countdown') drawCountdown(ctx, gs, W, H);
  if (gs.phase === 'pointWon') drawPointWon(ctx, gs, W, H);

  ctx.restore();
}

// ── Table ─────────────────────────────────────────────────────────────────────
function drawTable(ctx: CanvasRenderingContext2D, gs: GameState, time: number) {
  const arena = ARENAS.find(a => a.id === gs.arenaId) ?? ARENAS[0];
  const off = gs.tableMoveOffset;

  // Build corners
  const TL = project(-TABLE_HALF_W, TABLE_HALF_L, 0, off);
  const TR = project(TABLE_HALF_W, TABLE_HALF_L, 0, off);
  const BL = project(-TABLE_HALF_W, -TABLE_HALF_L, 0, off);
  const BR = project(TABLE_HALF_W, -TABLE_HALF_L, 0, off);
  const NL = project(-TABLE_HALF_W, NET_Y, 0, off);
  const NR = project(TABLE_HALF_W, NET_Y, 0, off);

  // Table surface fill
  ctx.beginPath();
  ctx.moveTo(TL.x, TL.y);
  ctx.lineTo(TR.x, TR.y);
  ctx.lineTo(BR.x, BR.y);
  ctx.lineTo(BL.x, BL.y);
  ctx.closePath();

  const tableGrad = ctx.createLinearGradient(BL.x, BL.y, TL.x, TL.y);
  tableGrad.addColorStop(0, arena.tableColor);
  tableGrad.addColorStop(0.5, blendColor(arena.tableColor, '#ffffff', 0.07));
  tableGrad.addColorStop(1, blendColor(arena.tableColor, '#000000', 0.2));
  ctx.fillStyle = tableGrad;
  ctx.fill();

  // Subtle reflection sheen
  ctx.globalAlpha = 0.06 + Math.sin(time * 0.5) * 0.02;
  const sheen = ctx.createLinearGradient(BL.x, BL.y, TR.x, TR.y);
  sheen.addColorStop(0, 'transparent');
  sheen.addColorStop(0.5, '#ffffff');
  sheen.addColorStop(1, 'transparent');
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Table outline
  ctx.strokeStyle = arena.tableLineColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center line (net line on surface)
  ctx.beginPath();
  ctx.moveTo(NL.x, NL.y);
  ctx.lineTo(NR.x, NR.y);
  ctx.strokeStyle = arena.tableLineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Side lines
  ctx.strokeStyle = arena.tableLineColor + '88';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(BL.x, BL.y); ctx.lineTo(TL.x, TL.y);
  ctx.moveTo(BR.x, BR.y); ctx.lineTo(TR.x, TR.y);
  ctx.stroke();

  // Center line (vertical)
  const CL = project(0, -TABLE_HALF_L, 0, off);
  const CF = project(0, TABLE_HALF_L, 0, off);
  ctx.strokeStyle = arena.tableLineColor + '44';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(CL.x, CL.y); ctx.lineTo(CF.x, CF.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Table edge thickness (3D depth)
  const edgeH = 12;
  ctx.fillStyle = blendColor(arena.tableColor, '#000000', 0.5);
  ctx.beginPath();
  ctx.moveTo(BL.x, BL.y);
  ctx.lineTo(BR.x, BR.y);
  ctx.lineTo(BR.x, BR.y + edgeH);
  ctx.lineTo(BL.x, BL.y + edgeH);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(BL.x, BL.y);
  ctx.lineTo(TL.x, TL.y);
  ctx.lineTo(TL.x, TL.y + edgeH * 0.3);
  ctx.lineTo(BL.x, BL.y + edgeH);
  ctx.closePath();
  ctx.fill();

  // NET
  drawNet(ctx, gs, off, arena.tableLineColor);

  // Table legs
  drawTableLegs(ctx, off);
}

function drawNet(ctx: CanvasRenderingContext2D, gs: GameState, off: number, lineColor: string) {
  const NL_top = project(-TABLE_HALF_W, NET_Y, NET_HEIGHT, off);
  const NR_top = project(TABLE_HALF_W, NET_Y, NET_HEIGHT, off);
  const NL_bot = project(-TABLE_HALF_W, NET_Y, 0, off);
  const NR_bot = project(TABLE_HALF_W, NET_Y, 0, off);
  const NC_top = project(0, NET_Y, NET_HEIGHT * 1.08, off); // Center slightly higher

  // Net mesh background
  const netGrad = ctx.createLinearGradient(NL_bot.x, NL_bot.y, NL_top.x, NL_top.y);
  netGrad.addColorStop(0, 'rgba(200,200,200,0.12)');
  netGrad.addColorStop(1, 'rgba(255,255,255,0.22)');
  ctx.fillStyle = netGrad;
  ctx.beginPath();
  ctx.moveTo(NL_bot.x, NL_bot.y);
  ctx.lineTo(NR_bot.x, NR_bot.y);
  ctx.lineTo(NR_top.x, NR_top.y);
  ctx.lineTo(NC_top.x, NC_top.y);
  ctx.lineTo(NL_top.x, NL_top.y);
  ctx.closePath();
  ctx.fill();

  // Net grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const ft = i / 6;
    const lx1 = lerp(NL_bot.x, NL_top.x, ft);
    const ly1 = lerp(NL_bot.y, NL_top.y, ft);
    const rx1 = lerp(NR_bot.x, NR_top.x, ft);
    const ry1 = lerp(NR_bot.y, NR_top.y, ft);
    ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(rx1, ry1); ctx.stroke();
  }
  // Vertical net lines
  for (let i = 1; i < 8; i++) {
    const ft = i / 8;
    const bx = lerp(NL_bot.x, NR_bot.x, ft);
    const by = lerp(NL_bot.y, NR_bot.y, ft);
    const tx = lerp(NL_top.x, NR_top.x, ft);
    const ty = lerp(NL_top.y, NR_top.y, ft);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  }

  // Net top wire
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(NL_top.x, NL_top.y);
  ctx.quadraticCurveTo(NC_top.x, NC_top.y - 4, NR_top.x, NR_top.y);
  ctx.stroke();

  // Net posts
  const postScale = NL_top.scale;
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(NL_top.x - 4 * postScale, NL_top.y, 8 * postScale, NL_bot.y - NL_top.y);
  ctx.fillRect(NR_top.x - 4 * postScale, NR_top.y, 8 * postScale, NR_bot.y - NR_top.y);
}

function drawTableLegs(ctx: CanvasRenderingContext2D, off: number) {
  const legColor = '#3a2a1a';
  const legH = 25;
  const corners: [number, number][] = [
    [-TABLE_HALF_W, -TABLE_HALF_L], [TABLE_HALF_W, -TABLE_HALF_L],
    [-TABLE_HALF_W, TABLE_HALF_L], [TABLE_HALF_W, TABLE_HALF_L],
  ];
  ctx.fillStyle = legColor;
  for (const [wx, wy] of corners) {
    const pt = project(wx, wy, 0, off);
    const w = 5 * pt.scale;
    ctx.fillRect(pt.x - w/2, pt.y, w, legH * pt.scale);
  }
}

// ── Paddle ────────────────────────────────────────────────────────────────────
function drawPaddle(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number, wz: number,
  angle: number,
  skinId: PaddleSkinId,
  alpha: number,
  tableOff: number,
) {
  const sp = project(wx, wy, wz, tableOff);
  const skin = PADDLE_SKINS.find(s => s.id === skinId) ?? PADDLE_SKINS[0];
  const sc = sp.scale;

  const bladeR = 28 * sc;       // circular rubber face radius (2× larger for visibility)
  const handleW = 14 * sc;      // handle width at blade base
  const handleWBot = 9 * sc;    // handle width at bottom (tapered)
  const handleLen = 46 * sc;    // handle length

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sp.x, sp.y);
  ctx.rotate(angle * 0.6);

  // Drop shadow (blade + handle combined)
  ctx.save();
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(3 * sc, 4 * sc, bladeR * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-handleW / 2 + 3 * sc, bladeR - 2 * sc + 4 * sc);
  ctx.lineTo(-handleWBot / 2 + 3 * sc, bladeR + handleLen + 4 * sc);
  ctx.lineTo(handleWBot / 2 + 3 * sc, bladeR + handleLen + 4 * sc);
  ctx.lineTo(handleW / 2 + 3 * sc, bladeR - 2 * sc + 4 * sc);
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = alpha;

  // ── Wooden handle ───────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-handleW / 2, bladeR - 3 * sc);
  ctx.lineTo(-handleWBot / 2, bladeR + handleLen);
  ctx.lineTo(handleWBot / 2, bladeR + handleLen);
  ctx.lineTo(handleW / 2, bladeR - 3 * sc);
  ctx.closePath();
  const handleGrad = ctx.createLinearGradient(-handleW / 2, 0, handleW / 2, 0);
  handleGrad.addColorStop(0,    '#3a1a05');
  handleGrad.addColorStop(0.25, '#7a3a10');
  handleGrad.addColorStop(0.55, '#b86a22');
  handleGrad.addColorStop(0.75, '#8B4513');
  handleGrad.addColorStop(1,    '#4a2008');
  ctx.fillStyle = handleGrad;
  ctx.fill();

  // Grip texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 0.9 * sc;
  for (let i = 0; i < 5; i++) {
    const gy = bladeR + 4 * sc + i * (handleLen - 6 * sc) / 4;
    const gw = lerp(handleW / 2 - 1, handleWBot / 2 + 0.5, i / 4);
    ctx.beginPath();
    ctx.moveTo(-gw, gy);
    ctx.lineTo(gw, gy);
    ctx.stroke();
  }

  // ── Blade wood edge ─────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(0, 0, bladeR, 0, Math.PI * 2);
  const woodGrad = ctx.createLinearGradient(-bladeR, -bladeR, bladeR, bladeR);
  woodGrad.addColorStop(0, '#d49040');
  woodGrad.addColorStop(1, '#7a3e10');
  ctx.fillStyle = woodGrad;
  ctx.fill();

  // ── Rubber face ─────────────────────────────────────────────────────────────
  const rubberR = bladeR - 2.5 * sc;
  ctx.beginPath();
  ctx.arc(0, 0, rubberR, 0, Math.PI * 2);
  const rubberGrad = ctx.createRadialGradient(
    -rubberR * 0.2, -rubberR * 0.25, 0,
    0, 0, rubberR
  );
  rubberGrad.addColorStop(0, blendColor(skin.colors[0], '#ffffff', 0.3));
  rubberGrad.addColorStop(0.55, skin.colors[0]);
  rubberGrad.addColorStop(1,  blendColor(skin.colors[0], skin.colors[1], 0.65));
  ctx.fillStyle = rubberGrad;
  ctx.fill();

  // Rubber sheen
  const sheenGrad = ctx.createRadialGradient(-rubberR * 0.3, -rubberR * 0.35, 0, 0, 0, rubberR);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheenGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheenGrad;
  ctx.fill();

  // Blade rim
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.arc(0, 0, bladeR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ── Ball ──────────────────────────────────────────────────────────────────────
function drawBall(ctx: CanvasRenderingContext2D, gs: GameState, skinId: BallSkinId, time: number) {
  const b = gs.ball;
  const sp = project(b.pos.x, b.pos.y, b.pos.z, gs.tableMoveOffset);
  const skin = BALL_SKINS.find(s => s.id === skinId) ?? BALL_SKINS[0];
  const r = BALL_RADIUS * 100 * sp.scale;

  let color = skin.color;
  // Rainbow ball cycles
  if (skinId === 'rainbow') {
    const hue = (time * 120) % 360;
    color = `hsl(${hue},100%,65%)`;
  }

  ctx.save();
  ctx.translate(sp.x, sp.y);

  // Glow
  ctx.shadowColor = skin.glowColor;
  ctx.shadowBlur = r * 2.5;
  if (gs.isPowerShot) { ctx.shadowBlur = r * 5; ctx.shadowColor = '#7c3aed'; }
  if (gs.swingSpeed > 3) ctx.shadowBlur = r * 3.5;

  // Ball body
  const ballGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
  ballGrad.addColorStop(0, blendColor(color, '#ffffff', 0.45));
  ballGrad.addColorStop(0.5, color);
  ballGrad.addColorStop(1, blendColor(color, '#000000', 0.3));
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.shadowBlur = 0;
  const hilite = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.3, -r * 0.35, r * 0.55);
  hilite.addColorStop(0, 'rgba(255,255,255,0.6)');
  hilite.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hilite;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Spin indicator (rotating line on ball)
  const spinMag = Math.sqrt(b.spin.x ** 2 + b.spin.z ** 2);
  if (spinMag > 0.3) {
    const spinAngle = Math.atan2(b.spin.z, b.spin.x) + time * spinMag * 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(spinAngle) * r * 0.6, Math.sin(spinAngle) * r * 0.6);
    ctx.lineTo(Math.cos(spinAngle + Math.PI) * r * 0.6, Math.sin(spinAngle + Math.PI) * r * 0.6);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Ball trail ────────────────────────────────────────────────────────────────
function drawBallTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  trailId: TrailId,
  time: number,
) {
  if (trailId === 'none' || trail.length < 2) return;
  const trailSkin = TRAIL_SKINS.find(t => t.id === trailId) ?? TRAIL_SKINS[0];
  if (trailSkin.colors.length === 0) return;

  for (let i = 1; i < trail.length; i++) {
    const t0 = trail[i - 1], t1 = trail[i];
    const age = (time - t1.t) / 0.35;
    const alpha = (1 - age) * 0.7;
    if (alpha <= 0) continue;

    const colorIdx = trailId === 'rainbow'
      ? Math.floor(((time * 3 + i * 0.2) % 1) * trailSkin.colors.length)
      : Math.floor((i / trail.length) * trailSkin.colors.length);
    const color = trailSkin.colors[Math.min(colorIdx, trailSkin.colors.length - 1)];

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = (1 - age) * 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.stroke();

    // Trail particle effect for fire/magic
    if ((trailId === 'fire' || trailId === 'magic') && Math.random() < 0.3) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ── Targets ────────────────────────────────────────────────────────────────────
function drawTargets(ctx: CanvasRenderingContext2D, gs: GameState, time: number) {
  for (const t of gs.targets) {
    if (t.hit) continue;
    const sp = project(t.worldX, t.worldY, 0.01, gs.tableMoveOffset);
    const r = t.radius * 100 * sp.scale;
    const pulse = 0.8 + Math.sin(time * 3 + t.pulsePhase) * 0.2;

    ctx.save();
    ctx.translate(sp.x, sp.y);

    const colors: Record<Target['type'], string> = {
      static: '#22d3ee', moving: '#f59e0b', tiny: '#ec4899', golden: '#ffd700', exploding: '#ef4444',
    };
    const color = colors[t.type];

    ctx.globalAlpha = 0.85;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * pulse;

    // Outer ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * sp.scale;
    ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.stroke();

    // Inner fill
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();

    // Points label
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(10 * sp.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${t.points}`, 0, 0);

    ctx.restore();
  }
}

// ── Power aura ────────────────────────────────────────────────────────────────
function drawPowerAura(ctx: CanvasRenderingContext2D, gs: GameState, time: number) {
  const p = gs.playerPaddle;
  const sp = project(p.pos.x, p.pos.y, p.pos.z, gs.tableMoveOffset);
  const charge = gs.powerShotCharge;
  const r = 40 * sp.scale * charge;

  ctx.save();
  ctx.translate(sp.x, sp.y);

  for (let ring = 0; ring < 3; ring++) {
    const ringR = r * (0.6 + ring * 0.2) * (1 + Math.sin(time * 8 + ring) * 0.1);
    const alpha = charge * 0.5 * (1 - ring * 0.25);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ring === 0 ? '#7c3aed' : ring === 1 ? '#a855f7' : '#d8b4fe';
    ctx.lineWidth = 3 * sp.scale;
    ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── Particles ─────────────────────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (p.type === 'confetti') {
      ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.type === 'star') {
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      drawStar(ctx, 0, 0, p.size * 0.4, p.size, 5);
    } else if (p.type === 'energy') {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r1: number, r2: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? r2 : r1;
    if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

// ── Score events ──────────────────────────────────────────────────────────────
function drawScoreEvents(ctx: CanvasRenderingContext2D, gs: GameState) {
  for (const e of gs.scoreEvents) {
    const t = e.life / e.maxLife;
    ctx.save();
    ctx.globalAlpha = t * 0.95;
    ctx.translate(e.screenX, e.screenY);
    ctx.scale(0.5 + t * 0.6, 0.5 + t * 0.6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${e.points > 0 ? 22 : 18}px sans-serif`;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = e.color;
    ctx.fillText(e.label, 0, 0);
    if (e.points > 0) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`+${e.points}`, 0, 22);
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

// ── Hand silhouette ───────────────────────────────────────────────────────────
function drawHandSilhouette(ctx: CanvasRenderingContext2D, hand: HandData, W: number, H: number) {
  const size = 52;
  const x = W - 80, y = H - 80;
  ctx.save();
  ctx.globalAlpha = 0.9;
  // Ring
  ctx.strokeStyle = hand.detected ? '#4ade80' : '#f87171';
  ctx.lineWidth = 3;
  ctx.shadowColor = hand.detected ? '#4ade80' : '#f87171';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Hand icon
  ctx.fillStyle = hand.detected ? '#4ade80' : '#f87171';
  ctx.shadowBlur = 0;
  ctx.font = `${size * 0.65}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hand.isFist ? '✊' : hand.detected ? '🖐️' : '🤚', x, y);

  ctx.restore();
  ctx.shadowBlur = 0;
}

// ── Phase overlays ────────────────────────────────────────────────────────────
function drawCountdown(ctx: CanvasRenderingContext2D, gs: GameState, W: number, H: number) {
  if (gs.countdown <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const t = gs.countdownTimer;
  const scale = 1 + (1 - t) * 0.5;
  const alpha = Math.min(1, t * 2);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 40;
  ctx.font = 'bold 140px sans-serif';
  ctx.fillText(`${gs.countdown}`, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gs.score.isPlayerServing ? 'Your Serve' : 'Opponent Serves', W / 2, H / 2 + 90);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPointWon(ctx: CanvasRenderingContext2D, gs: GameState, W: number, H: number) {
  const winner = gs.lastPointWinner;
  if (!winner) return;

  ctx.save();
  ctx.globalAlpha = Math.min(0.6, gs.pointWonTimer / 1.5);
  ctx.fillStyle = winner === 'player' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = winner === 'player' ? '#4ade80' : '#f87171';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 30;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(winner === 'player' ? '✓ POINT!' : '✗ OPPONENT SCORES', W / 2, H * 0.38);

  // Score display
  ctx.font = 'bold 80px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.fillText(`${gs.score.player}  —  ${gs.score.ai}`, W / 2, H * 0.5);

  ctx.restore();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function blendColor(hex: string, target: string, t: number): string {
  const p = (h: string) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  };
  const [r1,g1,b1] = p(hex), [r2,g2,b2] = p(target);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}

export type { RenderOptions };
