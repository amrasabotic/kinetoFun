interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string; shape: 'circle' | 'square' | 'star' | 'drop';
  rotation: number; rotSpeed: number;
  gravity: number;
}

const MAX_PARTICLES = 400;

export class ParticleSystem {
  private particles: Particle[] = [];

  spawnSplash(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 2.2;
      this.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 0.5,
        life: 0, maxLife: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 4, color, shape: 'drop',
        rotation: a, rotSpeed: (Math.random() - 0.5) * 6, gravity: 6,
      });
    }
  }

  spawnSparkle(x: number, y: number, count = 14) {
    const colors = ['#FFD700', '#FFFFFF', '#FFF3B0'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.6;
      this.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0, maxLife: 0.6 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, color: colors[i % colors.length], shape: 'star',
        rotation: 0, rotSpeed: (Math.random() - 0.5) * 8, gravity: 1,
      });
    }
  }

  spawnConfetti(x: number, y: number, count = 40) {
    const colors = ['#E4362E', '#2A5CD6', '#2FA35A', '#F4C430', '#F07A26', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 4;
      this.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1,
        life: 0, maxLife: 1.4 + Math.random() * 1,
        size: 3 + Math.random() * 4, color: colors[i % colors.length], shape: 'square',
        rotation: Math.random() * Math.PI, rotSpeed: (Math.random() - 0.5) * 10, gravity: 4,
      });
    }
  }

  private push(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.rotation += p.rotSpeed * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      const s = p.size * (1 - t * 0.3);
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else if (p.shape === 'drop') {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? s : s * 0.4;
          const a = (i / 8) * Math.PI * 2;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  get count() { return this.particles.length; }
}
