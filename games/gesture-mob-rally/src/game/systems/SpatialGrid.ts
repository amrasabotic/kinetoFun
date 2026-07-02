import type { StickFigureUnit } from '../../types';
import { GRID_CELL_SIZE } from '../../constants/gameConfig';

/**
 * Uniform spatial hash grid over (laneX, depthZ) for cheap neighbor queries
 * during flocking. Bucket arrays are reused across frames (cleared in place,
 * not reallocated) to avoid per-frame GC pressure at hundreds of units.
 */
export class SpatialGrid {
  private buckets = new Map<string, StickFigureUnit[]>();
  private usedKeys: string[] = [];
  private scratch: StickFigureUnit[] = [];

  private key(cx: number, cz: number): string {
    return cx + '_' + cz;
  }

  clear(): void {
    for (const k of this.usedKeys) {
      const arr = this.buckets.get(k);
      if (arr) arr.length = 0;
    }
    this.usedKeys.length = 0;
  }

  insert(u: StickFigureUnit): void {
    const cx = Math.floor(u.laneX / GRID_CELL_SIZE);
    const cz = Math.floor(u.depthZ / GRID_CELL_SIZE);
    const k = this.key(cx, cz);
    let arr = this.buckets.get(k);
    if (!arr) {
      arr = [];
      this.buckets.set(k, arr);
    }
    if (arr.length === 0) this.usedKeys.push(k);
    arr.push(u);
  }

  /** Returns a reused scratch array of units within `radius` cells of (laneX, depthZ). */
  queryNeighbors(laneX: number, depthZ: number, radius: number): StickFigureUnit[] {
    this.scratch.length = 0;
    const cellRadius = Math.max(1, Math.ceil(radius / GRID_CELL_SIZE));
    const cx = Math.floor(laneX / GRID_CELL_SIZE);
    const cz = Math.floor(depthZ / GRID_CELL_SIZE);
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const arr = this.buckets.get(this.key(cx + dx, cz + dz));
        if (!arr) continue;
        for (const u of arr) this.scratch.push(u);
      }
    }
    return this.scratch;
  }
}
