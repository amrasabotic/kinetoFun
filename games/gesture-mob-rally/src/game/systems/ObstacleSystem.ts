import type { ObstaclePlacement } from '../../types';
import { OBSTACLE_DEFS } from '../obstacles/obstacleDefs';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';
import { PLAYER_FRONT_OFFSET, COLLISION_WINDOW } from '../../constants/gameConfig';

export interface ObstacleHitEvent {
  obstacle: ObstaclePlacement;
  crowdDamage: number;
}

export interface ObstacleAvoidZone { laneX: number; relZ: number; laneSpan: number; }

export function updateObstacles(
  obstacles: ObstaclePlacement[],
  camera: RunnerCamera,
  playerLaneX: number,
  crowdHalfWidth: number,
  chargeActive: boolean,
  dtMs: number,
): ObstacleHitEvent[] {
  const events: ObstacleHitEvent[] = [];
  for (const o of obstacles) {
    if (o.hit || o.destroyed) continue;
    const def = OBSTACLE_DEFS[o.obstacleDefId];
    if (!def) continue;
    o.animPhase += dtMs / def.animSpeedMs;

    const relZ = toRelativeZ(camera, o.z);
    if (Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW) {
      const laneOverlap = Math.abs(o.laneX - playerLaneX) < (def.laneSpan / 2 + crowdHalfWidth);
      if (laneOverlap) {
        if (chargeActive && def.chargeModeDestructible) {
          o.destroyed = true;
        } else {
          o.hit = true;
          events.push({ obstacle: o, crowdDamage: def.crowdDamage });
        }
      }
    }
  }
  return events;
}

/** Obstacles within local dodge range ahead of the player, for FlockingSystem's avoidance steering. */
export function getAvoidZones(obstacles: ObstaclePlacement[], camera: RunnerCamera): ObstacleAvoidZone[] {
  const zones: ObstacleAvoidZone[] = [];
  for (const o of obstacles) {
    if (o.hit || o.destroyed) continue;
    const def = OBSTACLE_DEFS[o.obstacleDefId];
    if (!def) continue;
    const relZ = toRelativeZ(camera, o.z);
    if (relZ > PLAYER_FRONT_OFFSET - 0.5 && relZ < PLAYER_FRONT_OFFSET + 3) {
      zones.push({ laneX: o.laneX, relZ, laneSpan: def.laneSpan / 2 });
    }
  }
  return zones;
}

export function pruneObstacles(obstacles: ObstaclePlacement[], camera: RunnerCamera): ObstaclePlacement[] {
  return obstacles.filter((o) => !o.destroyed && toRelativeZ(camera, o.z) > -4);
}
