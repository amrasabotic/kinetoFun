import type {
  PlayerSnakeState, AISnakeState, EnergyOrb, PowerUp,
  Particle, CameraState, Environment, FloatingText,
} from '../../types';
import type { ArenaDecoration } from '../arena/arenaConfig';
import { worldToScreen } from '../camera/Camera';
import {
  ARENA_WIDTH, ARENA_HEIGHT, SNAKE_RADIUS,
} from '../../constants/gameConfig';
import { POWERUP_COLORS, POWERUP_ICONS } from '../collectibles/PowerUp';

// ── Color maps ────────────────────────────────────────────────────────────────

const ORB_GLOW_COLORS: Record<string, string> = {
  blue:    '#4FC3F7',
  green:   '#69F0AE',
  purple:  '#CE93D8',
  gold:    '#FFD740',
  rainbow: '#FF80AB',
};

// ── Main draw entry point ─────────────────────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cam: CameraState,
  env: Environment,
  decorations: ArenaDecoration[],
  orbs: EnergyOrb[],
  powerUps: PowerUp[],
  aiSnakes: AISnakeState[],
  player: PlayerSnakeState,
  skinColors: string[],
  particles: Particle[],
  floatingTexts: FloatingText[],
  now: number,
  quality: string,
): void {
  ctx.clearRect(0, 0, W, H);

  // ── Background ──────────────────────────────────────────────────────────────
  drawBackground(ctx, W, H, env, now);

  // ── World-space drawing (camera transform) ──────────────────────────────────
  ctx.save();
  ctx.translate(W / 2 - cam.x * cam.zoom, H / 2 - cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);

  drawArenaFloor(ctx, env, quality);
  if (quality !== 'low') drawDecorations(ctx, decorations);
  drawArenaBorder(ctx, env);

  if (quality === 'high') drawOrbGlows(ctx, orbs, now);
  drawOrbs(ctx, orbs, now);
  drawPowerUps(ctx, powerUps, now);

  // Draw AI snakes
  for (const ai of aiSnakes) {
    if (ai.alive && ai.segments.length > 1) {
      drawSnakeBody(ctx, ai.segments, ai.skinColors, ai.boosting, false, ai.segments[0], false, false, now, SNAKE_RADIUS);
    }
  }

  // Draw player snake
  if (player.alive && player.segments.length > 1) {
    drawSnakeBody(ctx, player.segments, skinColors, player.boosting, true, player.segments[0],
      player.shieldActive, player.ghostActive, now, SNAKE_RADIUS);
    drawSnakeHead(ctx, player.segments[0], player.segments[1] || player.segments[0],
      skinColors, player.blinkOpen, player.mouthOpen, true, player.shieldActive, now);
  }

  // Draw particles
  drawParticles(ctx, particles);

  // Floating texts
  drawFloatingTexts(ctx, floatingTexts);

  ctx.restore();
}

// ── Background ────────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, env: Environment, now: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, env.bgColors[0]);
  grad.addColorStop(1, env.bgColors[1] ?? env.bgColors[0]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated ambient dots
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = env.particleColor;
  const t = now * 0.0003;
  for (let i = 0; i < 12; i++) {
    const x = ((i * 137.5 + t * 30) % W);
    const y = ((i * 73.1 + t * 20) % H);
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.sin(t + i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Arena floor ────────────────────────────────────────────────────────────────

function drawArenaFloor(ctx: CanvasRenderingContext2D, env: Environment, quality: string): void {
  ctx.fillStyle = env.groundColor;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  if (quality === 'low') return;

  // Grid pattern
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = 0; x <= ARENA_WIDTH; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_HEIGHT); ctx.stroke();
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_WIDTH, y); ctx.stroke();
  }
  ctx.restore();
}

// ── Border ─────────────────────────────────────────────────────────────────────

function drawArenaBorder(ctx: CanvasRenderingContext2D, env: Environment): void {
  const bw = 40;
  ctx.save();
  ctx.strokeStyle = env.accentColor;
  ctx.lineWidth = 6;
  ctx.shadowColor = env.accentColor;
  ctx.shadowBlur = 20;
  ctx.strokeRect(bw, bw, ARENA_WIDTH - bw * 2, ARENA_HEIGHT - bw * 2);
  ctx.restore();

  // Danger fill near edges
  const grad = ctx.createLinearGradient(0, 0, bw, 0);
  grad.addColorStop(0, 'rgba(255,50,50,0.3)');
  grad.addColorStop(1, 'rgba(255,50,50,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, bw, ARENA_HEIGHT);
  const gradR = ctx.createLinearGradient(ARENA_WIDTH, 0, ARENA_WIDTH - bw, 0);
  gradR.addColorStop(0, 'rgba(255,50,50,0.3)');
  gradR.addColorStop(1, 'rgba(255,50,50,0)');
  ctx.fillStyle = gradR;
  ctx.fillRect(ARENA_WIDTH - bw, 0, bw, ARENA_HEIGHT);
}

// ── Decorations ───────────────────────────────────────────────────────────────

function drawDecorations(ctx: CanvasRenderingContext2D, decorations: ArenaDecoration[]): void {
  ctx.save();
  ctx.globalAlpha = 0.45;
  for (const d of decorations) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.fillStyle = d.color;
    switch (d.type) {
      case 'bush':
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.size * 0.7, -d.size * 0.3, d.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'rock':
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size, d.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'crystal':
        ctx.beginPath();
        ctx.moveTo(0, -d.size);
        ctx.lineTo(d.size * 0.5, 0);
        ctx.lineTo(0, d.size * 0.4);
        ctx.lineTo(-d.size * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'dot':
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star': {
        const r1 = d.size, r2 = d.size * 0.4, pts = 5;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
          const r = i % 2 === 0 ? r1 : r2;
          const a = (Math.PI / pts) * i - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

// ── Energy orb glows ──────────────────────────────────────────────────────────

function drawOrbGlows(ctx: CanvasRenderingContext2D, orbs: EnergyOrb[], now: number): void {
  for (const orb of orbs) {
    const pulse = 1 + 0.3 * Math.sin(orb.phase + now * 0.003);
    const color = ORB_GLOW_COLORS[orb.color] ?? '#ffffff';
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 2.5 * pulse);
    grad.addColorStop(0, color + 'aa');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Energy orbs ───────────────────────────────────────────────────────────────

function drawOrbs(ctx: CanvasRenderingContext2D, orbs: EnergyOrb[], now: number): void {
  for (const orb of orbs) {
    const bob = Math.sin(orb.bobOffset + now * 0.002) * 2;
    const pulse = 1 + 0.15 * Math.sin(orb.phase + now * 0.003);
    const r = orb.radius * pulse;
    const x = orb.x, y = orb.y + bob;
    const color = ORB_GLOW_COLORS[orb.color] ?? '#4FC3F7';

    if (orb.color === 'rainbow') {
      // Rainbow rotating gradient
      const hue = (now * 0.1 + orb.phase * 20) % 360;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `hsla(${hue},100%,80%,1)`);
      grad.addColorStop(1, `hsla(${(hue + 120) % 360},100%,60%,1)`);
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, color + '88');
      ctx.fillStyle = grad;
    }

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle dots
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const sparkAngle = now * 0.002 + orb.phase;
    ctx.beginPath();
    ctx.arc(x + Math.cos(sparkAngle) * r * 0.6, y + Math.sin(sparkAngle) * r * 0.6, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[], now: number): void {
  for (const pu of powerUps) {
    const bob = Math.sin(pu.phase + now * 0.002) * 4;
    const spin = (now * 0.002 + pu.phase) % (Math.PI * 2);
    const color = POWERUP_COLORS[pu.type];
    const x = pu.x, y = pu.y + bob;
    const r = 18;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);

    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    // Hexagon shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Icon
    ctx.save();
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_ICONS[pu.type], x, y + bob);
    ctx.restore();

    // Lifetime warning pulse
    if (pu.lifetime < 3000) {
      ctx.save();
      ctx.globalAlpha = 0.4 * Math.abs(Math.sin(now * 0.005));
      ctx.strokeStyle = '#FF5252';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y + bob, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Snake body ────────────────────────────────────────────────────────────────

function drawSnakeBody(
  ctx: CanvasRenderingContext2D,
  segments: { x: number; y: number }[],
  colors: string[],
  boosting: boolean,
  isPlayer: boolean,
  head: { x: number; y: number },
  shieldActive: boolean,
  ghostActive: boolean,
  now: number,
  radius: number,
): void {
  if (segments.length < 2) return;

  ctx.save();
  if (ghostActive) ctx.globalAlpha = 0.5;

  const n = segments.length;

  // Boost glow trail
  if (boosting && isPlayer) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = radius * 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = colors[0];
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);
    const limit = Math.min(30, n);
    for (let i = 1; i < limit; i++) ctx.lineTo(segments[i].x, segments[i].y);
    ctx.stroke();
    ctx.restore();
  }

  // Body segments
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n;
    const tailTaper = Math.max(0.25, 1 - t * 0.75);
    const r = radius * tailTaper;
    const seg = segments[i];
    const prev = segments[i - 1];

    // Color cycling
    const colorIdx = Math.floor((i / n) * colors.length);
    const bodyColor = colors[Math.min(colorIdx, colors.length - 1)];

    const waveOffset = isPlayer ? Math.sin((i * 0.4) + now * 0.005) * 1.5 : 0;
    const dx = prev.x - seg.x, dy = prev.y - seg.y;
    const perp = Math.atan2(dy, dx) + Math.PI / 2;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(seg.x + Math.cos(perp) * waveOffset, seg.y + Math.sin(perp) * waveOffset, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shield aura
  if (shieldActive) {
    ctx.save();
    ctx.strokeStyle = '#4FC3F7';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#4FC3F7';
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.005);
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ── Snake head ────────────────────────────────────────────────────────────────

function drawSnakeHead(
  ctx: CanvasRenderingContext2D,
  head: { x: number; y: number },
  neck: { x: number; y: number },
  colors: string[],
  blinkOpen: boolean,
  mouthOpen: number,
  _isPlayer: boolean,
  shieldActive: boolean,
  now: number,
): void {
  const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
  const r = SNAKE_RADIUS * 1.6;

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  // Head circle
  const headGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.1);
  headGrad.addColorStop(0, lightenColor(colors[0], 40));
  headGrad.addColorStop(1, colors[0]);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eyes
  const eyeY = -r * 0.38;
  const eyeX = r * 0.38;
  for (const ey of [eyeY, -eyeY]) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eyeX, ey, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    if (blinkOpen) {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(eyeX + r * 0.06, ey, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // Glint
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(eyeX + r * 0.04, ey - r * 0.05, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blink — closed line
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eyeX - r * 0.2, ey);
      ctx.lineTo(eyeX + r * 0.2, ey);
      ctx.stroke();
    }
  }

  // Mouth / smile
  if (mouthOpen > 0.1) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r * 0.5, 0, r * 0.45 * mouthOpen, 0.1, Math.PI * 0.9);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r * 0.5, r * 0.1, r * 0.25, 0.3, Math.PI * 0.7);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (!p.active || p.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.type === 'explosion' || p.type === 'combo') {
      ctx.beginPath();
      ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (p.type === 'sparkle' || p.type === 'firefly') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
    }
    ctx.restore();
  }
}

// ── Floating texts ────────────────────────────────────────────────────────────

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  ctx.save();
  for (const ft of texts) {
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 22px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();
}

// ── Minimap ───────────────────────────────────────────────────────────────────

export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  player: PlayerSnakeState,
  aiSnakes: AISnakeState[],
  powerUps: PowerUp[],
): void {
  const scaleX = mapW / ARENA_WIDTH;
  const scaleY = mapH / ARENA_HEIGHT;

  ctx.save();
  ctx.translate(mapX, mapY);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0, 0, mapW, mapH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(0, 0, mapW, mapH, 6);
  ctx.clip();

  // AI snakes
  for (const ai of aiSnakes) {
    if (!ai.alive || ai.segments.length === 0) continue;
    ctx.fillStyle = ai.skinColors[0];
    ctx.beginPath();
    ctx.arc(ai.segments[0].x * scaleX, ai.segments[0].y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Power-ups
  ctx.fillStyle = '#FFD740';
  for (const pu of powerUps) {
    ctx.beginPath();
    ctx.arc(pu.x * scaleX, pu.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player
  if (player.alive && player.segments.length > 0) {
    const h = player.segments[0];
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(h.x * scaleX, h.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(2, 2, mapW - 4, mapH - 4);
  ctx.stroke();

  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amount);
  return `rgb(${r},${g},${b})`;
}
