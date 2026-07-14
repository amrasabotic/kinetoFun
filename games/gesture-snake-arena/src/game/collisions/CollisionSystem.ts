import type { PlayerSnakeState, AISnakeState, EnergyOrb, PowerUp } from '../../types';
import { SpatialGrid } from '../../utils/spatialGrid';
import { dist2 } from '../../utils/mathUtils';
import { SNAKE_RADIUS, MAGNET_RADIUS, ARENA_WIDTH, ARENA_HEIGHT } from '../../constants/gameConfig';

// Grid cell size ≈ 3× collision radius for efficiency
const CELL_SIZE = SNAKE_RADIUS * 6;
const aiBodyGrid = new SpatialGrid(ARENA_WIDTH, ARENA_HEIGHT, CELL_SIZE);

export interface CollisionEvents {
  orbsCollected: EnergyOrb[];
  powerUpsCollected: PowerUp[];
  playerDied: boolean;
  aiKilled: AISnakeState[];
}

const PICKUP_R2 = (SNAKE_RADIUS + 20) ** 2;

export function runCollisions(
  player: PlayerSnakeState,
  aiSnakes: AISnakeState[],
  orbs: EnergyOrb[],
  powerUps: PowerUp[],
): CollisionEvents {
  const events: CollisionEvents = {
    orbsCollected: [],
    powerUpsCollected: [],
    playerDied: false,
    aiKilled: [],
  };

  if (!player.alive) return events;

  const head = player.segments[0];

  // ── Build AI body grid ────────────────────────────────────────────────────
  aiBodyGrid.clear();
  for (const ai of aiSnakes) {
    if (!ai.alive) continue;
    // Only insert every 3rd segment for performance
    for (let i = 1; i < ai.segments.length; i += 3) {
      aiBodyGrid.insert({ id: ai.id, x: ai.segments[i].x, y: ai.segments[i].y });
    }
  }

  // ── Player vs AI body ─────────────────────────────────────────────────────
  if (!player.ghostActive && !player.shieldActive) {
    const nearby = aiBodyGrid.query(head.x, head.y, SNAKE_RADIUS * 4);
    for (const entry of nearby) {
      if (dist2(head.x, head.y, entry.x, entry.y) < (SNAKE_RADIUS * 2) ** 2) {
        events.playerDied = true;
        break;
      }
    }
  }

  // ── AI vs Player body (simplified: check head vs first 60% of player body) ─
  const playerBodyGrid = new SpatialGrid(ARENA_WIDTH, ARENA_HEIGHT, CELL_SIZE);
  const playerBodyEnd = Math.floor(player.segments.length * 0.6);
  for (let i = 2; i < playerBodyEnd; i += 3) {
    playerBodyGrid.insert({ id: 0, x: player.segments[i].x, y: player.segments[i].y });
  }

  for (const ai of aiSnakes) {
    if (!ai.alive || ai.segments.length === 0) continue;
    const aiHead = ai.segments[0];

    // Check AI head vs player body
    const bodyNear = playerBodyGrid.query(aiHead.x, aiHead.y, SNAKE_RADIUS * 3);
    if (bodyNear.some(e => dist2(aiHead.x, aiHead.y, e.x, e.y) < (SNAKE_RADIUS * 2) ** 2)) {
      events.aiKilled.push(ai);
      continue;
    }

    // Head-to-head with other AI
    for (const other of aiSnakes) {
      if (other.id === ai.id || !other.alive) continue;
      if (dist2(aiHead.x, aiHead.y, other.segments[0].x, other.segments[0].y) < (SNAKE_RADIUS * 2) ** 2) {
        if (ai.length <= other.length) {
          events.aiKilled.push(ai);
        }
      }
    }
  }

  // ── Player head vs AI head ────────────────────────────────────────────────
  if (!events.playerDied) {
    for (const ai of aiSnakes) {
      if (!ai.alive) continue;
      if (dist2(head.x, head.y, ai.segments[0].x, ai.segments[0].y) < (SNAKE_RADIUS * 2) ** 2) {
        if (player.length <= ai.length && !player.shieldActive) {
          events.playerDied = true;
        } else if (player.length > ai.length) {
          events.aiKilled.push(ai);
        }
      }
    }
  }

  // ── Player head vs orbs ───────────────────────────────────────────────────
  const magnetR2 = player.magnetActive ? MAGNET_RADIUS ** 2 : PICKUP_R2;
  for (const orb of orbs) {
    if (dist2(head.x, head.y, orb.x, orb.y) < magnetR2) {
      events.orbsCollected.push(orb);
    }
  }

  // ── Player head vs power-ups ──────────────────────────────────────────────
  for (const pu of powerUps) {
    if (dist2(head.x, head.y, pu.x, pu.y) < PICKUP_R2 * 4) {
      events.powerUpsCollected.push(pu);
    }
  }

  return events;
}

/** Check if player hits the arena boundary (hard kill zone) */
export function checkBoundaryDeath(player: PlayerSnakeState): boolean {
  if (!player.alive || player.segments.length === 0) return false;
  const h = player.segments[0];
  const margin = 15;
  return h.x < margin || h.x > ARENA_WIDTH - margin ||
         h.y < margin || h.y > ARENA_HEIGHT - margin;
}
