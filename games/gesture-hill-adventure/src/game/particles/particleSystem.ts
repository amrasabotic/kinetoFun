/**
 * Pool-based particle system — no external libraries.
 * All particles are stored in a flat array (max PARTICLE_MAX).
 */
import type { Particle, ParticleType } from '../../types';
import { PARTICLE_MAX } from '../../constants/gameConfig';

// ── Spawn helpers ─────────────────────────────────────────────────────────────

function makeParticle(
  x: number, y: number,
  vx: number, vy: number,
  color: string,
  size: number,
  type: ParticleType,
  maxLife: number,
  gravity = 1,
  shrink  = 0.96,
  rotSpeed = 0,
): Particle {
  return {
    x, y, vx, vy,
    life: 1, maxLife,
    color, size, type,
    gravity, alpha: 1,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed,
    shrink,
  };
}

/** Append particles to the list, capping at PARTICLE_MAX. */
function emit(list: Particle[], ...particles: Particle[]): void {
  for (const p of particles) {
    if (list.length >= PARTICLE_MAX) {
      list.shift(); // remove oldest
    }
    list.push(p);
  }
}

// ── Public emitters ───────────────────────────────────────────────────────────

/** Dust cloud from wheels on ground contact */
export function emitDust(
  list: Particle[], x: number, y: number, speed: number, color: string,
): void {
  const count = Math.min(4, 1 + Math.floor(Math.abs(speed) / 80));
  for (let i = 0; i < count; i++) {
    const vx = (Math.random() - 0.5) * 1.6 - (speed > 0 ? 1.2 : -1.2);
    const vy = -Math.random() * 1.4;
    emit(list, makeParticle(
      x + (Math.random() - 0.5) * 20, y,
      vx, vy,
      color,
      6 + Math.random() * 8, 'dust',
      0.65, 0.08, 0.93,
    ));
  }
}

/** Black / grey exhaust smoke from pipe */
export function emitSmoke(
  list: Particle[], x: number, y: number,
): void {
  emit(list, makeParticle(
    x, y,
    (Math.random() - 0.5) * 0.6 - 0.5,
    -0.6 - Math.random() * 0.5,
    `hsl(0,0%,${30 + Math.random() * 30}%)`,
    8 + Math.random() * 6, 'smoke',
    1.4, 0.015, 0.98,
  ));
}

/** Landing dirt burst */
export function emitLandingDirt(
  list: Particle[], x: number, y: number, velY: number, color: string,
): void {
  const count = Math.min(14, Math.floor(Math.abs(velY) * 1.2));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI;
    const speed = 2 + Math.random() * 3 * Math.abs(velY) * 0.12;
    emit(list, makeParticle(
      x + (Math.random() - 0.5) * 30, y,
      Math.cos(angle) * speed, -Math.sin(angle) * speed * 0.6,
      color,
      4 + Math.random() * 7, 'landingDirt',
      0.8, 1, 0.95, (Math.random() - 0.5) * 0.06,
    ));
  }
}

/** Boost flame particles behind vehicle */
export function emitBoostFlame(
  list: Particle[], x: number, y: number, angle: number,
): void {
  const cols = ['#FF6D00', '#FF3D00', '#FFD600', '#FF6D00'];
  for (let i = 0; i < 3; i++) {
    const speed = 3 + Math.random() * 2;
    const spread = (Math.random() - 0.5) * 0.6;
    emit(list, makeParticle(
      x, y,
      -Math.cos(angle + spread) * speed,
      -Math.sin(angle + spread) * speed,
      cols[Math.floor(Math.random() * cols.length)],
      7 + Math.random() * 8, 'boostFlame',
      0.35, 0.04, 0.90,
    ));
  }
}

/** Coin collect sparkle burst */
export function emitCoinSparkle(
  list: Particle[], x: number, y: number,
): void {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const speed = 2.5 + Math.random() * 1.5;
    emit(list, makeParticle(
      x, y,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      i % 2 === 0 ? '#FFE878' : '#FFD700',
      4 + Math.random() * 5, 'coinSparkle',
      0.55, 0.05, 0.92, 0.1,
    ));
  }
}

/** Fuel can glow burst */
export function emitFuelGlow(
  list: Particle[], x: number, y: number,
): void {
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    emit(list, makeParticle(
      x, y,
      Math.cos(angle) * 2, Math.sin(angle) * 2,
      '#00E5FF',
      5 + Math.random() * 6, 'fuelGlow',
      0.6, 0.02, 0.93,
    ));
  }
}

/** Crash explosion */
export function emitExplosion(
  list: Particle[], x: number, y: number,
): void {
  const cols = ['#FF6D00', '#FF3D00', '#FFD600', '#EF5350', '#FF8F00'];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    emit(list, makeParticle(
      x + (Math.random() - 0.5) * 20,
      y + (Math.random() - 0.5) * 20,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      cols[Math.floor(Math.random() * cols.length)],
      6 + Math.random() * 12, 'explosion',
      0.9, 0.6, 0.93, (Math.random() - 0.5) * 0.1,
    ));
  }
}

/** Ambient environment particles (snow flakes, lava sparks, candy confetti) */
export function emitAmbient(
  list: Particle[], x: number, y: number, color: string, type: ParticleType,
): void {
  if (list.filter(p => p.type === 'ambient').length > 60) return;
  emit(list, makeParticle(
    x, y,
    (Math.random() - 0.5) * 0.5, 0.8 + Math.random() * 0.5,
    color,
    2 + Math.random() * 4, type,
    2.5, type === 'ambient' ? 0.12 : -0.04, 1, 0,
  ));
}

// ── Update ────────────────────────────────────────────────────────────────────

/** Steps all particles forward by dt milliseconds. Removes dead ones. */
export function updateParticles(list: Particle[], dt: number): void {
  const sec = dt / 1000;
  for (let i = list.length - 1; i >= 0; i--) {
    const p  = list[i];
    p.x    += p.vx * dt * 0.05;
    p.y    += p.vy * dt * 0.05;
    p.vy   += p.gravity * 0.04 * dt * 0.05;
    p.size *= p.shrink;
    p.rotation += p.rotSpeed;
    p.life -= sec / p.maxLife;
    p.alpha = Math.max(0, p.life);
    if (p.life <= 0 || p.size < 0.5) list.splice(i, 1);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

/** Draws all particles. Call inside the camera transform. */
export function renderParticles(
  ctx: CanvasRenderingContext2D, particles: Particle[],
): void {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha * 0.92;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    switch (p.type) {
      case 'smoke':
      case 'dust': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'landingDirt':
      case 'explosion': {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;
      }
      case 'boostFlame': {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, 'rgba(255,255,120,0.9)');
        g.addColorStop(0.5, p.color);
        g.addColorStop(1,   'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'coinSparkle': {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 4;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;
      }
      case 'fuelGlow': {
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default: {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}
