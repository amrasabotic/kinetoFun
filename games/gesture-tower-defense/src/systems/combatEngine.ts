import type { BattleState, Enemy, EnemyDef, Point, PlacedTower, Projectile, TowerTypeId, WaveDef } from '../types';
import type { PreparedPath } from './pathing';
import { pointAtProgress } from './pathing';
import { TOWER_DEFS, SELL_REFUND_FRACTION } from '../data/towers';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function createInitialBattle(mapId: string, totalWaves: number, startingCurrency: number, startingBaseHealth: number): BattleState {
  return {
    mapId,
    waveIndex: -1,
    totalWaves,
    currency: startingCurrency,
    baseHealth: startingBaseHealth,
    maxBaseHealth: startingBaseHealth,
    towers: [],
    enemies: [],
    projectiles: [],
    pendingSpawns: [],
    simTimeMs: 0,
    waveActive: false,
    won: false,
    lost: false,
  };
}

/** Begins the given wave: schedules its spawns relative to the current sim time. Only valid when no wave is currently active. */
export function startWave(state: BattleState, wave: WaveDef): BattleState {
  if (state.waveActive || state.won || state.lost) return state;
  return {
    ...state,
    waveIndex: wave.index,
    waveActive: true,
    pendingSpawns: wave.spawns.map((s) => ({ defId: s.defId, atMs: state.simTimeMs + s.delayMs })),
  };
}

export function placeTower(state: BattleState, slotIndex: number, typeId: TowerTypeId): BattleState {
  const def = TOWER_DEFS[typeId];
  if (state.currency < def.cost) return state;
  if (state.towers.some((t) => t.slotIndex === slotIndex)) return state;
  return {
    ...state,
    currency: state.currency - def.cost,
    towers: [...state.towers, { id: nextId('tower'), slotIndex, typeId, cooldownMs: 0 }],
  };
}

/** Relocates a placed tower to a different empty slot, free of charge — dragging it is just repositioning, not re-buying. */
export function moveTower(state: BattleState, towerId: string, newSlotIndex: number): BattleState {
  if (!state.towers.some((t) => t.id === towerId)) return state;
  if (state.towers.some((t) => t.slotIndex === newSlotIndex && t.id !== towerId)) return state;
  return { ...state, towers: state.towers.map((t) => (t.id === towerId ? { ...t, slotIndex: newSlotIndex } : t)) };
}

export function sellTower(state: BattleState, towerId: string): BattleState {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return state;
  const def = TOWER_DEFS[tower.typeId];
  return {
    ...state,
    currency: state.currency + Math.round(def.cost * SELL_REFUND_FRACTION),
    towers: state.towers.filter((t) => t.id !== towerId),
  };
}

function enemyPosition(enemy: Enemy, prepared: PreparedPath): Point {
  return pointAtProgress(prepared, enemy.progress);
}

function freshEnemy(defId: string, def: EnemyDef): Enemy {
  return { id: nextId('enemy'), defId, hp: def.hp, maxHp: def.hp, progress: 0, slowUntilMs: 0, speedFactor: 1 };
}

export type TickEvent =
  | { type: 'shot'; towerType: TowerTypeId }
  | { type: 'kill'; reward: number }
  | { type: 'baseHit'; damage: number }
  | { type: 'waveCleared' };

export interface TickResult {
  state: BattleState;
  events: TickEvent[];
}

/**
 * Advances the battle by `dtMs`. A single pure function, in the same spirit
 * as this catalog's other per-tick engines (e.g. Gesture Mini-Golf's
 * `stepBall`): spawns due enemies, moves existing ones along the path,
 * lets towers acquire and fire at in-range targets, advances projectiles
 * and resolves hits, and updates wave/win/loss state — all in one place so
 * there is exactly one source of truth for what a tick does. Alongside the
 * new state it also returns the discrete `events` that happened this tick
 * (a shot, a kill, base damage, a wave clearing) so the UI layer can play
 * the right sound/update lifetime stats without having to diff two states
 * to infer what happened.
 */
export function tickBattle(
  state: BattleState,
  dtMs: number,
  slotPositions: Point[],
  prepared: PreparedPath,
  enemyDefs: Record<string, EnemyDef>,
): TickResult {
  if (state.won || state.lost) return { state, events: [] };

  const events: TickEvent[] = [];

  const simTimeMs = state.simTimeMs + dtMs;

  // 1. Spawn any enemies whose scheduled time has arrived.
  const pendingSpawns = state.pendingSpawns.filter((s) => s.atMs > simTimeMs);
  const newEnemies = state.pendingSpawns.filter((s) => s.atMs <= simTimeMs).map((s) => freshEnemy(s.defId, enemyDefs[s.defId]));

  // 2. Move enemies along the path; any that reach the end damage the base.
  let baseHealth = state.baseHealth;
  const survivingEnemies: Enemy[] = [];
  for (const enemy of [...state.enemies, ...newEnemies]) {
    const def = enemyDefs[enemy.defId];
    const slowed = simTimeMs < enemy.slowUntilMs;
    const speed = def.speed * (slowed ? enemy.speedFactor : 1);
    const nextProgress = enemy.progress + speed * (dtMs / 1000);
    if (nextProgress >= 1) {
      baseHealth -= def.damageToBase;
      events.push({ type: 'baseHit', damage: def.damageToBase });
    } else {
      survivingEnemies.push({ ...enemy, progress: nextProgress });
    }
  }
  const lost = baseHealth <= 0;

  // 3. Towers acquire a target (the enemy furthest along the path within
  // range — the standard "most dangerous first" TD targeting rule) and fire.
  const towers: PlacedTower[] = [];
  const newProjectiles: Projectile[] = [];
  for (const tower of state.towers) {
    const def = TOWER_DEFS[tower.typeId];
    const pos = slotPositions[tower.slotIndex];
    let cooldownMs = Math.max(0, tower.cooldownMs - dtMs);

    if (cooldownMs <= 0 && pos) {
      let best: Enemy | null = null;
      for (const enemy of survivingEnemies) {
        const epos = enemyPosition(enemy, prepared);
        if (Math.hypot(epos.x - pos.x, epos.y - pos.y) > def.range) continue;
        if (!best || enemy.progress > best.progress) best = enemy;
      }
      if (best) {
        newProjectiles.push({
          id: nextId('proj'),
          fromX: pos.x,
          fromY: pos.y,
          targetEnemyId: best.id,
          x: pos.x,
          y: pos.y,
          speed: def.projectileSpeed,
          damage: def.damage,
          splashRadius: def.splashRadius,
          slowFactor: def.slowFactor,
          slowDurationMs: def.slowDurationMs,
          color: def.color,
        });
        cooldownMs = def.fireRateMs;
        events.push({ type: 'shot', towerType: tower.typeId });
      }
    }
    towers.push({ ...tower, cooldownMs });
  }

  // 4. Advance projectiles and resolve hits against current enemy positions.
  const enemyById = new Map(survivingEnemies.map((e) => [e.id, e]));
  let currency = state.currency;
  const damageById = new Map<string, number>();
  const slowById = new Map<string, { factor: number; untilMs: number }>();
  const projectiles: Projectile[] = [];

  for (const proj of [...state.projectiles, ...newProjectiles]) {
    const target = enemyById.get(proj.targetEnemyId);
    if (!target) continue; // target already died to another projectile this tick — this one simply fizzles

    const targetPos = enemyPosition(target, prepared);
    const dx = targetPos.x - proj.x;
    const dy = targetPos.y - proj.y;
    const distToTarget = Math.hypot(dx, dy);
    const travel = proj.speed * (dtMs / 1000);

    if (travel >= distToTarget) {
      const hitAll = proj.splashRadius > 0
        ? survivingEnemies.filter((e) => Math.hypot(enemyPosition(e, prepared).x - targetPos.x, enemyPosition(e, prepared).y - targetPos.y) <= proj.splashRadius)
        : [target];

      for (const hit of hitAll) {
        damageById.set(hit.id, (damageById.get(hit.id) ?? 0) + proj.damage);
        if (proj.slowFactor > 0) {
          slowById.set(hit.id, { factor: proj.slowFactor, untilMs: simTimeMs + proj.slowDurationMs });
        }
      }
    } else {
      projectiles.push({ ...proj, x: proj.x + (dx / distToTarget) * travel, y: proj.y + (dy / distToTarget) * travel });
    }
  }

  const finalEnemies: Enemy[] = [];
  for (const enemy of survivingEnemies) {
    const dmg = damageById.get(enemy.id) ?? 0;
    const hp = enemy.hp - dmg;
    if (hp <= 0) {
      const reward = enemyDefs[enemy.defId].reward;
      currency += reward;
      events.push({ type: 'kill', reward });
      continue;
    }
    const slow = slowById.get(enemy.id);
    finalEnemies.push({
      ...enemy,
      hp,
      slowUntilMs: slow ? slow.untilMs : enemy.slowUntilMs,
      speedFactor: slow ? slow.factor : enemy.speedFactor,
    });
  }

  const waveCleared = pendingSpawns.length === 0 && finalEnemies.length === 0;
  const waveActive = state.waveActive && !waveCleared;
  const won = !lost && waveCleared && state.waveIndex >= state.totalWaves - 1 && state.waveActive;
  if (waveCleared && state.waveActive) events.push({ type: 'waveCleared' });

  return {
    state: {
      ...state,
      simTimeMs,
      baseHealth: Math.max(0, baseHealth),
      towers,
      enemies: finalEnemies,
      projectiles,
      pendingSpawns,
      waveActive,
      won,
      lost,
      currency,
    },
    events,
  };
}
