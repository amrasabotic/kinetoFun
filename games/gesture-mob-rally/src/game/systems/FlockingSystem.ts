import type { StickFigureUnit } from '../../types';
import { SpatialGrid } from './SpatialGrid';
import {
  FLOCK_SEPARATION_RADIUS, FLOCK_SEPARATION_WEIGHT, FLOCK_COHESION_WEIGHT,
  FLOCK_MAX_STEER_SPEED, FLOCK_NEIGHBOR_RADIUS, TRACK_HALF_WIDTH,
} from '../../constants/gameConfig';
import { clamp } from '../../utils/mathUtils';

export interface CrowdAnchor {
  laneX: number;
  z: number;
}

interface ObstacleAvoid { laneX: number; relZ: number; laneSpan: number; }

/**
 * Boids-style steering (separation + cohesion-to-formation-slot) run once per
 * frame over every active unit of a team. No physics engine: cheap scalar
 * accumulation per unit against grid-bucketed neighbors, no per-frame
 * allocation beyond the grid's reused scratch array.
 */
export function updateFlock(
  units: StickFigureUnit[],
  grid: SpatialGrid,
  anchor: CrowdAnchor,
  dt: number,
  avoidZones: ObstacleAvoid[] = [],
): void {
  const dtS = dt / 1000;

  for (const u of units) {
    if (!u.active) continue;

    // Target = crowd anchor + this unit's assigned formation offset
    const targetX = clamp(anchor.laneX + u.formationSlotX, -TRACK_HALF_WIDTH + 0.15, TRACK_HALF_WIDTH - 0.15);
    const targetZ = anchor.z + u.formationSlotZ;

    let steerX = (targetX - u.laneX) * FLOCK_COHESION_WEIGHT;
    let steerZ = (targetZ - u.depthZ) * FLOCK_COHESION_WEIGHT;

    // Separation from nearby units (own + other team) — soft jostle, no rigid collision
    const neighbors = grid.queryNeighbors(u.laneX, u.depthZ, FLOCK_NEIGHBOR_RADIUS);
    let sepX = 0, sepZ = 0, sepCount = 0;
    for (const n of neighbors) {
      if (n === u || !n.active) continue;
      const dx = u.laneX - n.laneX;
      const dz = u.depthZ - n.depthZ;
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < FLOCK_SEPARATION_RADIUS) {
        const push = (FLOCK_SEPARATION_RADIUS - d) / FLOCK_SEPARATION_RADIUS;
        sepX += (dx / d) * push;
        sepZ += (dz / d) * push;
        sepCount++;
      }
    }
    if (sepCount > 0) {
      steerX += sepX * FLOCK_SEPARATION_WEIGHT;
      steerZ += sepZ * FLOCK_SEPARATION_WEIGHT;
    }

    // Local obstacle avoidance — nudge laneX away from a swept obstacle ahead
    for (const zone of avoidZones) {
      const dz = Math.abs(u.depthZ - zone.relZ);
      if (dz < 1.2) {
        const dx = u.laneX - zone.laneX;
        if (Math.abs(dx) < zone.laneSpan) {
          const dir = dx >= 0 ? 1 : -1;
          steerX += dir * (zone.laneSpan - Math.abs(dx)) * 2.2;
        }
      }
    }

    // Integrate with a max steer speed clamp so movement is smooth, never snapping
    u.vx = clamp(steerX, -FLOCK_MAX_STEER_SPEED, FLOCK_MAX_STEER_SPEED);
    u.vz = clamp(steerZ, -FLOCK_MAX_STEER_SPEED, FLOCK_MAX_STEER_SPEED);
    u.laneX = clamp(u.laneX + u.vx * dtS, -TRACK_HALF_WIDTH, TRACK_HALF_WIDTH);
    u.depthZ += u.vz * dtS;

    // Leg-swing / bob animation phase advances with movement
    u.animPhase += dtS * (6 + Math.hypot(u.vx, u.vz));
    u.height = Math.abs(Math.sin(u.animPhase)) * 0.05;
  }
}
