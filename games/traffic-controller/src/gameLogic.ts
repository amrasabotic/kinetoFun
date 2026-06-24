import type { GestureData, Gesture } from './useGestureTracking';

export const CANVAS_W = 800;
export const CANVAS_H = 560;

// Road geometry (exported for canvas renderer)
export const ROAD_Y1 = 220;  // top of horizontal road
export const ROAD_Y2 = 340;  // bottom of horizontal road
export const ROAD_X1 = 340;  // left of vertical road
export const ROAD_X2 = 460;  // right of vertical road

// Lane centerlines
export const LANE_NX = 370;  // fromNorth: x, cars travel south (↓)
export const LANE_SX = 430;  // fromSouth: x, cars travel north (↑)
export const LANE_EY = 250;  // fromEast:  y, cars travel west  (←)
export const LANE_WY = 310;  // fromWest:  y, cars travel east  (→)

export type Direction     = 'north' | 'south' | 'east' | 'west';
export type TrafficPhase  = 'all-red' | 'ns-green' | 'ew-green' | 'ped';
export type GamePhase     = 'playing' | 'gameover';

const CAR_COLORS  = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];
export const ANGER_MS    = 14000;   // ms before an angry car runs the red
const PHASE_MAX   = 7500;    // ms before auto-reset to all-red
const LOCK_MS     = 1000;    // ms gesture lock after phase change
const CAR_CROSS   = 1700;    // ms for a car to cross intersection
const PED_CROSS   = 3800;    // ms for a ped group to cross
const MAX_QUEUE   = 7;
const BASE_SPAWN  = 2600;    // ms/lane at t=0
const MIN_SPAWN   = 1000;    // ms/lane after 60s

function spawnInterval(elapsed: number): number {
  const t = Math.min(elapsed / 60000, 1);
  return BASE_SPAWN - t * (BASE_SPAWN - MIN_SPAWN);
}

export interface QueuedCar {
  id: number;
  color: string;
  waitMs: number;
}

export interface CrossingCar {
  id: number;
  from: Direction;
  color: string;
  t: number;   // 0→1, position through intersection
}

export interface PedGroup {
  id: number;
  side: 'top' | 'bottom';   // which crosswalk (top = north edge, bottom = south edge)
  waitMs: number;
  crossing: boolean;
  t: number;                 // crossing progress 0→1
}

export interface GameState {
  gamePhase: GamePhase;
  trafficPhase: TrafficPhase;
  phaseMs: number;           // ms current traffic phase active
  lockMs: number;            // gesture lock countdown
  queues: Record<Direction, QueuedCar[]>;
  crossingCars: CrossingCar[];
  pedGroups: PedGroup[];
  score: number;
  strikes: number;
  strikeFlashMs: number;
  elapsed: number;
  highScore: number;
  spawnMs: Record<Direction, number>;
  pedSpawnMs: number;
  nextId: number;
  lastGesture: Gesture;      // last triggered gesture (for display)
}

export type GameEvent =
  | { type: 'car-pass' }
  | { type: 'ped-pass' }
  | { type: 'horn' }
  | { type: 'strike' }
  | { type: 'phase-change' };

export interface UpdateResult {
  state: GameState;
  events: GameEvent[];
}

export function initialGameState(): GameState {
  return {
    gamePhase: 'playing',
    trafficPhase: 'all-red',
    phaseMs: 0,
    lockMs: 0,
    queues: { north: [], south: [], east: [], west: [] },
    crossingCars: [],
    pedGroups: [],
    score: 0,
    strikes: 0,
    strikeFlashMs: 0,
    elapsed: 0,
    highScore: 0,
    spawnMs: { north: 800, south: 1400, east: 500, west: 1900 },
    pedSpawnMs: 7000,
    nextId: 1,
    lastGesture: 'none',
  };
}

export function restartGame(highScore: number): GameState {
  return { ...initialGameState(), highScore };
}

const DIRS: Direction[] = ['north', 'south', 'east', 'west'];

export function updateGame(gs: GameState, gesture: GestureData, delta: number): UpdateResult {
  if (gs.gamePhase === 'gameover') return { state: gs, events: [] };

  const events: GameEvent[] = [];
  const s = { ...gs };
  s.queues = {
    north: [...s.queues.north],
    south: [...s.queues.south],
    east:  [...s.queues.east],
    west:  [...s.queues.west],
  };

  s.elapsed         += delta;
  s.strikeFlashMs    = Math.max(0, s.strikeFlashMs - delta);
  s.lockMs           = Math.max(0, s.lockMs - delta);

  // ── Gesture → traffic phase change ──────────────────────────────────────────
  if (gesture.detected && s.lockMs <= 0) {
    let target: TrafficPhase | null = null;
    if (gesture.gesture === 'point-right') target = 'ns-green';
    if (gesture.gesture === 'point-left')  target = 'ew-green';
    if (gesture.gesture === 'wave')        target = 'ped';
    if (gesture.gesture === 'stop')        target = 'all-red';

    if (target !== null && target !== s.trafficPhase) {
      s.trafficPhase  = target;
      s.phaseMs       = 0;
      s.lockMs        = LOCK_MS;
      s.lastGesture   = gesture.gesture;
      events.push({ type: 'phase-change' });
    }
  }

  // ── Auto-reset to all-red after PHASE_MAX ────────────────────────────────────
  s.phaseMs += delta;
  if (s.trafficPhase !== 'all-red' && s.phaseMs >= PHASE_MAX) {
    s.trafficPhase = 'all-red';
    s.phaseMs      = 0;
  }

  // ── Spawn cars ───────────────────────────────────────────────────────────────
  const spawnInt = spawnInterval(s.elapsed);
  s.spawnMs = { ...s.spawnMs };
  for (const dir of DIRS) {
    s.spawnMs[dir] -= delta;
    if (s.spawnMs[dir] <= 0) {
      s.spawnMs[dir] = spawnInt + (Math.random() - 0.5) * 400;
      if (s.queues[dir].length < MAX_QUEUE) {
        s.queues[dir] = [...s.queues[dir], {
          id: s.nextId++,
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
          waitMs: 0,
        }];
      }
    }
  }

  // ── Spawn pedestrian groups ─────────────────────────────────────────────────
  s.pedSpawnMs -= delta;
  if (s.pedSpawnMs <= 0) {
    s.pedSpawnMs = 8000 + Math.random() * 6000;
    const side = Math.random() < 0.5 ? 'top' : 'bottom';
    const alreadyWaiting = s.pedGroups.some(p => p.side === side && !p.crossing);
    if (!alreadyWaiting) {
      s.pedGroups = [...s.pedGroups, {
        id: s.nextId++, side, waitMs: 0, crossing: false, t: 0,
      }];
    }
  }

  // ── Age waiting cars, check for angry run-reds ───────────────────────────────
  for (const dir of DIRS) {
    s.queues[dir] = s.queues[dir].map(c => ({ ...c, waitMs: c.waitMs + delta }));
    const front = s.queues[dir][0];
    if (front && front.waitMs >= ANGER_MS) {
      // Car runs red!
      s.queues[dir] = s.queues[dir].slice(1);
      s.strikes++;
      s.strikeFlashMs = 1600;
      events.push({ type: 'horn' });
      events.push({ type: 'strike' });
      if (s.strikes >= 3) { s.gamePhase = 'gameover'; }
    }
  }

  // ── Age waiting pedestrians ──────────────────────────────────────────────────
  s.pedGroups = s.pedGroups.map(p => p.crossing ? p : { ...p, waitMs: p.waitMs + delta });
  for (const pg of s.pedGroups) {
    if (!pg.crossing && pg.waitMs >= 12000) {
      s.strikes++;
      s.strikeFlashMs = 1600;
      events.push({ type: 'strike' });
      if (s.strikes >= 3) s.gamePhase = 'gameover';
      // Remove the overdue group
      s.pedGroups = s.pedGroups.filter(p => p.id !== pg.id);
    }
  }

  // ── Release cars when green ──────────────────────────────────────────────────
  if (s.trafficPhase === 'ns-green') {
    for (const dir of ['north', 'south'] as Direction[]) {
      const q = s.queues[dir];
      const inFlight = s.crossingCars.some(c => c.from === dir && c.t < 0.6);
      if (q.length > 0 && !inFlight) {
        const car = q[0];
        s.queues[dir] = q.slice(1);
        s.crossingCars = [...s.crossingCars, { id: car.id, from: dir, color: car.color, t: 0 }];
      }
    }
  }
  if (s.trafficPhase === 'ew-green') {
    for (const dir of ['east', 'west'] as Direction[]) {
      const q = s.queues[dir];
      const inFlight = s.crossingCars.some(c => c.from === dir && c.t < 0.6);
      if (q.length > 0 && !inFlight) {
        const car = q[0];
        s.queues[dir] = q.slice(1);
        s.crossingCars = [...s.crossingCars, { id: car.id, from: dir, color: car.color, t: 0 }];
      }
    }
  }

  // ── Release peds when ped phase ──────────────────────────────────────────────
  if (s.trafficPhase === 'ped') {
    s.pedGroups = s.pedGroups.map(p =>
      !p.crossing ? { ...p, crossing: true } : p
    );
  }

  // ── Advance crossing cars ────────────────────────────────────────────────────
  const carSpeed = 1 / CAR_CROSS;
  const newCrossing: CrossingCar[] = [];
  for (const c of s.crossingCars) {
    const t2 = c.t + carSpeed * delta;
    if (t2 >= 1) { events.push({ type: 'car-pass' }); s.score += 10; }
    else newCrossing.push({ ...c, t: t2 });
  }
  s.crossingCars = newCrossing;

  // ── Advance crossing peds ────────────────────────────────────────────────────
  const pedSpeed = 1 / PED_CROSS;
  const newPeds: PedGroup[] = [];
  for (const p of s.pedGroups) {
    if (!p.crossing) { newPeds.push(p); continue; }
    const t2 = p.t + pedSpeed * delta;
    if (t2 >= 1) { events.push({ type: 'ped-pass' }); s.score += 25; }
    else newPeds.push({ ...p, t: t2 });
  }
  s.pedGroups = newPeds;

  // Survival score: 1 pt/sec
  s.score += delta / 1000;

  return { state: s, events };
}
