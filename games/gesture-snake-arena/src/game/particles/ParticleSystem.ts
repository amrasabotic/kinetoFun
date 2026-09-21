import type { Particle, ParticleType } from '../../types';
import {
  PARTICLE_POOL_SIZE, EXPLOSION_PARTICLES, PICKUP_PARTICLES, BOOST_PARTICLES,
} from '../../constants/gameConfig';
import { randomRange } from '../../utils/mathUtils';

export class ParticleSystem {
  private pool: Particle[];
  private active: Particle[] = [];

  constructor() {
    this.pool = Array.from({ length: PARTICLE_POOL_SIZE }, () => this.makeParticle());
  }

  private makeParticle(): Particle {
    return {
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, decay: 0, size: 0, color: '#fff',
      alpha: 1, type: 'sparkle', rotation: 0, rotSpeed: 0,
    };
  }

  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null; // pool exhausted
  }

  update(dt: number): void {
    const dtS = dt / 1000;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.x += p.vx * dtS * 60;
      p.y += p.vy * dtS * 60;
      p.vy += 0.02 * dtS * 60; // gentle gravity
      p.life -= p.decay * dtS * 60;
      p.alpha = Math.max(0, p.life);
      p.rotation += p.rotSpeed * dtS * 60;
      if (p.life <= 0) {
        p.active = false;
        this.active.splice(i, 1);
      }
    }
  }

  getActive(): Particle[] { return this.active; }

  // ── Emitters ────────────────────────────────────────────────────────────────

  emitExplosion(x: number, y: number, colors: string[], count = EXPLOSION_PARTICLES): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;
      const angle = (Math.PI * 2 * i) / count + randomRange(-0.3, 0.3);
      const speed = randomRange(0.5, 4);
      p.active = true; p.type = 'explosion';
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 1;
      p.life = 1; p.decay = randomRange(0.008, 0.02);
      p.size = randomRange(3, 12);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1; p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = randomRange(-0.1, 0.1);
      this.active.push(p);
    }
  }

  emitPickup(x: number, y: number, color: string): void {
    for (let i = 0; i < PICKUP_PARTICLES; i++) {
      const p = this.acquire();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.3, 1.5);
      p.active = true; p.type = 'sparkle';
      p.x = x + randomRange(-8, 8); p.y = y + randomRange(-8, 8);
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 0.5;
      p.life = 1; p.decay = randomRange(0.02, 0.04);
      p.size = randomRange(2, 6);
      p.color = color; p.alpha = 1; p.rotation = 0; p.rotSpeed = 0;
      this.active.push(p);
    }
  }

  emitBoost(x: number, y: number, color: string, angle: number): void {
    for (let i = 0; i < BOOST_PARTICLES; i++) {
      const p = this.acquire();
      if (!p) return;
      const spread = randomRange(-0.5, 0.5);
      const speed = randomRange(1, 3);
      p.active = true; p.type = 'boost';
      p.x = x; p.y = y;
      p.vx = Math.cos(angle + Math.PI + spread) * speed;
      p.vy = Math.sin(angle + Math.PI + spread) * speed;
      p.life = 1; p.decay = randomRange(0.03, 0.06);
      p.size = randomRange(3, 8);
      p.color = color; p.alpha = 0.8; p.rotation = 0; p.rotSpeed = 0;
      this.active.push(p);
    }
  }

  emitCombo(x: number, y: number, level: number): void {
    const count = 10 + level * 5;
    const colors = ['#FFD700','#FF8C00','#FF4500'];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(1, 3 + level * 0.5);
      p.active = true; p.type = 'combo';
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 2;
      p.life = 1; p.decay = randomRange(0.01, 0.02);
      p.size = randomRange(4, 10);
      p.color = colors[i % colors.length]; p.alpha = 1;
      p.rotation = Math.random() * Math.PI * 2; p.rotSpeed = randomRange(-0.2, 0.2);
      this.active.push(p);
    }
  }

  emitPowerUp(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const p = this.acquire();
      if (!p) return;
      const angle = (Math.PI * 2 * i) / 20;
      const speed = randomRange(0.5, 2);
      p.active = true; p.type = 'pickup';
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 1;
      p.life = 1; p.decay = randomRange(0.015, 0.025);
      p.size = randomRange(5, 14);
      p.color = color; p.alpha = 1;
      p.rotation = Math.random() * Math.PI * 2; p.rotSpeed = randomRange(-0.15, 0.15);
      this.active.push(p);
    }
  }

  emitAmbient(x: number, y: number, color: string): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true; p.type = 'dust';
    p.x = x + randomRange(-400, 400);
    p.y = y + randomRange(-300, 300);
    p.vx = randomRange(-0.2, 0.2); p.vy = randomRange(-0.4, -0.1);
    p.life = 1; p.decay = 0.003;
    p.size = randomRange(1, 4);
    p.color = color; p.alpha = 0.5;
    p.rotation = 0; p.rotSpeed = 0;
    this.active.push(p);
  }

  emitFirefly(x: number, y: number): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true; p.type = 'firefly';
    p.x = x + randomRange(-500, 500);
    p.y = y + randomRange(-400, 400);
    p.vx = randomRange(-0.3, 0.3); p.vy = randomRange(-0.3, 0.3);
    p.life = 1; p.decay = 0.001;
    p.size = randomRange(2, 5);
    p.color = '#FFFF99'; p.alpha = 0.8;
    p.rotation = 0; p.rotSpeed = 0;
    this.active.push(p);
  }

  clear(): void {
    for (const p of this.active) p.active = false;
    this.active = [];
  }
}
