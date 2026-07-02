import type { PowerUpPlacement, ActivePowerUp, PowerUpDef } from '../../types';
import { POWERUP_DEFS } from '../powerups/powerupDefs';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';
import { PLAYER_FRONT_OFFSET, COLLISION_WINDOW } from '../../constants/gameConfig';

export interface PowerUpCollectEvent { def: PowerUpDef; }

export function updatePowerUpPlacements(
  placements: PowerUpPlacement[],
  camera: RunnerCamera,
  playerLaneX: number,
  crowdHalfWidth: number,
): PowerUpCollectEvent[] {
  const events: PowerUpCollectEvent[] = [];
  for (const p of placements) {
    if (p.collected) continue;
    const relZ = toRelativeZ(camera, p.z);
    if (Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW) {
      if (Math.abs(p.laneX - playerLaneX) < 0.7 + crowdHalfWidth) {
        const def = POWERUP_DEFS[p.powerUpDefId];
        if (def) {
          p.collected = true;
          events.push({ def });
        }
      }
    }
  }
  return events;
}

export function prunePowerUps(placements: PowerUpPlacement[], camera: RunnerCamera): PowerUpPlacement[] {
  return placements.filter((p) => !p.collected && toRelativeZ(camera, p.z) > -4);
}

export function addActivePowerUp(active: ActivePowerUp[], def: PowerUpDef): void {
  if (def.instant) return;
  const existing = active.find((a) => a.kind === def.kind);
  if (existing) {
    existing.remainingMs = def.durationMs;
    existing.totalMs = def.durationMs;
  } else {
    active.push({ kind: def.kind, remainingMs: def.durationMs, totalMs: def.durationMs });
  }
}

export function tickActivePowerUps(active: ActivePowerUp[], dtMs: number): void {
  for (let i = active.length - 1; i >= 0; i--) {
    active[i].remainingMs -= dtMs;
    if (active[i].remainingMs <= 0) active.splice(i, 1);
  }
}

export function hasActive(active: ActivePowerUp[], kind: string): boolean {
  return active.some((a) => a.kind === kind);
}
