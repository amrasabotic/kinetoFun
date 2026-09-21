import { PARTICLE_POOL_SIZE } from '../../constants/gameConfig';

export interface Particle {
  active: boolean;
  laneX: number;
  depthZ: number;
  height: number;
  vx: number; vz: number; vh: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

function makeParticle(): Particle {
  return { active: false, laneX: 0, depthZ: 0, height: 0, vx: 0, vz: 0, vh: 0, life: 0, maxLife: 1, color: '#fff', size: 4 };
}

/** Fixed-size particle pool — same acquire/emit/update pattern as gesture-snake-arena's ParticleSystem. */
export class ParticleSystem {
  private pool: Particle[];
  private active: Particle[] = [];

  constructor(size: number = PARTICLE_POOL_SIZE) {
    this.pool = Array.from({ length: size }, makeParticle);
  }

  private acquire(): Particle | null {
    for (const p of this.pool) if (!p.active) return p;
    return null;
  }

  private emit(laneX: number, depthZ: number, color: string, count: number, opts: Partial<Particle> = {}): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;
      p.active = true;
      p.laneX = laneX + (Math.random() - 0.5) * 0.3;
      p.depthZ = depthZ + (Math.random() - 0.5) * 0.3;
      p.height = opts.height ?? 0.1;
      p.vx = (Math.random() - 0.5) * 3;
      p.vz = (Math.random() - 0.5) * 3;
      p.vh = 1 + Math.random() * 2;
      p.life = p.maxLife = opts.maxLife ?? (0.5 + Math.random() * 0.4);
      p.color = color;
      p.size = opts.size ?? (3 + Math.random() * 3);
      this.active.push(p);
    }
  }

  emitObstacleHit(laneX: number, depthZ: number, color: string): void {
    this.emit(laneX, depthZ, color, 18, { maxLife: 0.6 });
  }

  emitGateBurst(laneX: number, depthZ: number, color: string): void {
    this.emit(laneX, depthZ, color, 24, { maxLife: 0.7, size: 5 });
  }

  emitCombatClash(laneX: number, depthZ: number): void {
    this.emit(laneX, depthZ, '#F1F5F9', 10, { maxLife: 0.35 });
  }

  emitCastleCollapse(laneX: number, depthZ: number, color: string): void {
    this.emit(laneX, depthZ, color, 80, { maxLife: 1.2, size: 7 });
  }

  emitBossTelegraph(laneX: number, depthZ: number, color: string): void {
    this.emit(laneX, depthZ, color, 6, { maxLife: 0.4, size: 6 });
  }

  emitPowerUpBurst(laneX: number, depthZ: number, color: string): void {
    this.emit(laneX, depthZ, color, 14, { maxLife: 0.5 });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.laneX += p.vx * dt;
      p.depthZ += p.vz * dt;
      p.height += p.vh * dt;
      p.vh -= dt * 4; // gravity
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.active.splice(i, 1);
      }
    }
  }

  getActive(): Particle[] {
    return this.active;
  }
}
