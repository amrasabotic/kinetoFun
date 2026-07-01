interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

const POOL_SIZE = 600;

export class ParticleSystem {
  private pool: Particle[] = [];
  private cursor = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0 });
    }
  }

  private spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, gravity = 0): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.gravity = gravity;
  }

  burstOrb(x: number, y: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      this.spawn(x, y, Math.cos(a) * 40, Math.sin(a) * 40, 0.35, 2.5, color);
    }
  }

  burstPower(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 90;
      this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.6 + Math.random() * 0.3, 3 + Math.random() * 2, color);
    }
  }

  burstDefeat(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 70;
      this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5, 3, '#ffffff', 40);
    }
  }

  burstHit(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, y, Math.cos(a) * 90, Math.sin(a) * 90, 0.4, 3, '#ff4d4d');
    }
  }

  confetti(x: number, y: number): void {
    const colors = ['#0af0ff', '#ff2ecb', '#39ff88', '#ffd23f'];
    for (let i = 0; i < 6; i++) {
      const vx = (Math.random() - 0.5) * 120;
      this.spawn(x, y, vx, -140 - Math.random() * 80, 1.4, 3 + Math.random() * 2, colors[i % colors.length], 220);
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
