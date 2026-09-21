import type { StickFigureUnit, Team } from '../../types';
import { MAX_UNITS } from '../../constants/gameConfig';
import { makeUnit, resetUnit } from './StickFigure';

/**
 * Fixed-size object pool for stick-figure units, shared between the player
 * crowd and all enemy crowds (tagged by `team`). Mirrors the pooling
 * pattern used by gesture-snake-arena's ParticleSystem: preallocate once,
 * scan for an inactive slot on acquire, never allocate per frame.
 */
export class UnitPool {
  private pool: StickFigureUnit[];
  private nextId = 1;
  private activeList: StickFigureUnit[] = [];

  constructor(size: number = MAX_UNITS) {
    this.pool = Array.from({ length: size }, () => makeUnit());
  }

  acquire(team: Team, laneX: number, depthZ: number, colorIndex: number): StickFigureUnit | null {
    for (const u of this.pool) {
      if (!u.active) {
        u.id = this.nextId++;
        resetUnit(u, team, laneX, depthZ, colorIndex);
        return u;
      }
    }
    return null; // pool exhausted — caller should cap visual spawns
  }

  release(u: StickFigureUnit): void {
    u.active = false;
  }

  releaseAll(): void {
    for (const u of this.pool) u.active = false;
  }

  /** Returns the live active-unit list (rebuilt in place, no per-frame allocation of the array itself beyond truncation). */
  getActive(): StickFigureUnit[] {
    this.activeList.length = 0;
    for (const u of this.pool) {
      if (u.active) this.activeList.push(u);
    }
    return this.activeList;
  }

  countActive(team?: Team): number {
    let n = 0;
    for (const u of this.pool) {
      if (u.active && (team === undefined || u.team === team)) n++;
    }
    return n;
  }

  capacityRemaining(): number {
    let free = 0;
    for (const u of this.pool) if (!u.active) free++;
    return free;
  }
}
