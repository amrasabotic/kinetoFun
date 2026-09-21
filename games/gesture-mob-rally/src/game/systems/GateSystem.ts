import type { GatePlacement, GateDef } from '../../types';
import { GATE_DEFS } from '../gates/gateDefs';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';
import { PLAYER_FRONT_OFFSET, COLLISION_WINDOW, GATE_CATCH_RADIUS } from '../../constants/gameConfig';

export interface GateEvent {
  chosen: GatePlacement | null;
  def: GateDef | null;
  missed: boolean;
}

/**
 * Gates sharing the same z spawn as a group (2-3 choices). If the player's
 * crowd is within catch radius of one of them, the closest is "chosen" and
 * its op applied; the rest in the group are marked resolved without effect.
 * If the crowd isn't close enough to any of them, it's a total miss
 * (combo resets, no op applied) — this is what makes "missing a gate"
 * actually possible instead of always snapping to the nearest choice.
 */
export function updateGates(
  gates: GatePlacement[],
  camera: RunnerCamera,
  playerLaneX: number,
  crowdHalfWidth: number,
): GateEvent[] {
  const events: GateEvent[] = [];
  const groups = new Map<number, GatePlacement[]>();

  for (const g of gates) {
    if (g.resolved) continue;
    const relZ = toRelativeZ(camera, g.z);
    if (Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW) {
      const arr = groups.get(g.z) ?? [];
      arr.push(g);
      groups.set(g.z, arr);
    }
  }

  const catchRadius = GATE_CATCH_RADIUS + crowdHalfWidth;

  for (const group of groups.values()) {
    let chosen: GatePlacement | null = null;
    let bestDist = Infinity;
    for (const g of group) {
      const d = Math.abs(g.laneX - playerLaneX);
      if (d < catchRadius && d < bestDist) { bestDist = d; chosen = g; }
    }
    for (const g of group) g.resolved = true;
    if (chosen) {
      const def = GATE_DEFS[chosen.gateDefId] ?? null;
      events.push({ chosen, def, missed: false });
    } else {
      events.push({ chosen: null, def: null, missed: true });
    }
  }

  return events;
}

export function pruneGates(gates: GatePlacement[], camera: RunnerCamera): GatePlacement[] {
  return gates.filter((g) => toRelativeZ(camera, g.z) > -4);
}
