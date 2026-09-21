import type { PinchData } from './usePinchTracking';

export const CANVAS_W = 820;
export const CANVAS_H = 500;
export const GROUND_Y = 440; // y of ground surface

// ─── Slingshot config ──────────────────────────────────────────────────────────
export const SLING = {
  anchorX: 155,
  anchorY: 348,
  forkLX: 134, forkLY: 306,
  forkRX: 175, forkRY: 306,
  maxPull: 92,   // max drag radius in canvas px
  grabRadius: 68, // px around anchor where pinch grabs bird
};

// ─── Physics constants ──────────────────────────────────────────────────────────
const GRAVITY = 0.46;
const LAUNCH_POWER = 0.195;
const BIRD_RADIUS = 18;
const GROUND_BOUNCE = 0.32;
const GROUND_FRICTION = 0.80;
const STOP_THRESHOLD = 0.8;

// ─── Types ──────────────────────────────────────────────────────────────────────
export type EntityType = 'wood' | 'stone' | 'glass' | 'pig';

export interface Entity {
  id: number;
  x: number; y: number;
  w: number; h: number;
  type: EntityType;
  hp: number;
  maxHp: number;
  dead: boolean;
}

export interface Bird {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  state: 'ready' | 'flying' | 'stopped';
  bounces: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;  // 1 → 0
  color: string;
  size: number;
}

export type GamePhase =
  | 'aiming'     // bird sitting in slingshot, waiting for grab
  | 'pulling'    // user pinching and pulling back
  | 'flying'     // bird in flight
  | 'settling'   // bird stopped, wait before next bird
  | 'levelComplete'
  | 'gameOver';

export interface GameState {
  phase: GamePhase;
  level: number;
  score: number;
  birdsLeft: number;   // remaining birds in queue (not counting current)
  bird: Bird;
  entities: Entity[];
  particles: Particle[];
  pull: { x: number; y: number } | null;  // canvas coords of current pull position
  settleTimer: number;   // ms countdown after bird stops
  justKilled: string[];  // entity types killed this frame for audio cues
}

// ─── Break force (min impact speed to damage each type) ──────────────────────
const BREAK_FORCE: Record<EntityType, number> = {
  glass: 1.5,
  wood:  3.5,
  pig:   2.5,
  stone: 6.0,
};

const ENTITY_HP: Record<EntityType, number> = {
  glass: 1,
  wood:  1,
  pig:   1,
  stone: 2,
};

// ─── Level definitions ─────────────────────────────────────────────────────────
// All y coords assume GROUND_Y = 440; entity.y + entity.h = GROUND_Y for ground-resting entities.

type LevelDef = {
  birds: number;
  entities: { x: number; y: number; w: number; h: number; type: EntityType }[];
};

const LEVELS: LevelDef[] = [
  // Level 1 – Warmup: open pig + pig on pillar
  {
    birds: 3,
    entities: [
      { x: 490, y: 400, w: 40, h: 40, type: 'pig' },
      { x: 595, y: 360, w: 40, h: 80, type: 'wood' },
      { x: 595, y: 320, w: 40, h: 40, type: 'pig' },
    ],
  },
  // Level 2 – Tower: stacked tower + glass-shielded pig
  {
    birds: 3,
    entities: [
      // Wood tower + pig on top
      { x: 470, y: 400, w: 50, h: 40, type: 'wood' },
      { x: 470, y: 360, w: 50, h: 40, type: 'wood' },
      { x: 470, y: 320, w: 50, h: 40, type: 'wood' },
      { x: 470, y: 280, w: 50, h: 40, type: 'pig' },
      // Glass-shielded pig
      { x: 605, y: 360, w: 18, h: 80, type: 'glass' },
      { x: 623, y: 400, w: 44, h: 40, type: 'pig' },
      { x: 667, y: 360, w: 18, h: 80, type: 'glass' },
    ],
  },
  // Level 3 – Fortress: cage + dual tower
  {
    birds: 4,
    entities: [
      // Cage (pig inside)
      { x: 450, y: 420, w: 130, h: 20, type: 'wood' },   // floor
      { x: 450, y: 380, w: 20,  h: 40, type: 'wood' },   // left wall
      { x: 560, y: 380, w: 20,  h: 40, type: 'wood' },   // right wall
      { x: 455, y: 380, w: 105, h: 40, type: 'pig' },    // pig inside cage
      { x: 450, y: 360, w: 130, h: 20, type: 'wood' },   // roof
      // Right: stone base + pig stack
      { x: 650, y: 400, w: 44, h: 40, type: 'stone' },
      { x: 650, y: 360, w: 44, h: 40, type: 'pig' },
      { x: 650, y: 320, w: 44, h: 40, type: 'stone' },
      { x: 650, y: 280, w: 44, h: 40, type: 'pig' },
      // Lone pig far right
      { x: 740, y: 400, w: 40, h: 40, type: 'pig' },
    ],
  },
  // Level 4 – The Castle: stone fortress, 4 pigs
  {
    birds: 5,
    entities: [
      // Foundation
      { x: 430, y: 420, w: 240, h: 20, type: 'stone' },
      // Outer walls
      { x: 430, y: 340, w: 22,  h: 80, type: 'stone' },
      { x: 648, y: 340, w: 22,  h: 80, type: 'stone' },
      // Inner glass floor
      { x: 452, y: 400, w: 196, h: 20, type: 'glass' },
      // Two pigs on glass floor
      { x: 470, y: 360, w: 40, h: 40, type: 'pig' },
      { x: 590, y: 360, w: 40, h: 40, type: 'pig' },
      // Stone ceiling
      { x: 430, y: 320, w: 240, h: 20, type: 'stone' },
      // Turrets
      { x: 440, y: 260, w: 30, h: 60, type: 'wood' },
      { x: 630, y: 260, w: 30, h: 60, type: 'wood' },
      // Turret pigs
      { x: 435, y: 220, w: 40, h: 40, type: 'pig' },
      { x: 625, y: 220, w: 40, h: 40, type: 'pig' },
    ],
  },
];

export function getLevelCount(): number { return LEVELS.length; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clampPull(px: number, py: number): { x: number; y: number } {
  const dx = px - SLING.anchorX;
  const dy = py - SLING.anchorY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= SLING.maxPull) return { x: px, y: py };
  const scale = SLING.maxPull / dist;
  return { x: SLING.anchorX + dx * scale, y: SLING.anchorY + dy * scale };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Circle–AABB collision: returns impact speed (0 = no collision)
function circleRectCollide(
  bird: Bird,
  entity: Entity
): { impact: number; nx: number; ny: number } | null {
  const closestX = Math.max(entity.x, Math.min(bird.x, entity.x + entity.w));
  const closestY = Math.max(entity.y, Math.min(bird.y, entity.y + entity.h));
  const dx = bird.x - closestX;
  const dy = bird.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= bird.radius * bird.radius || distSq === 0) return null;
  const d = Math.sqrt(distSq);
  return { impact: Math.abs(bird.vx * (dx / d) + bird.vy * (dy / d)), nx: dx / d, ny: dy / d };
}

export function spawnParticles(x: number, y: number, color: string, count = 10): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      color,
      size: 3 + Math.random() * 5,
    });
  }
  return particles;
}

// ─── Initial state ─────────────────────────────────────────────────────────────

function makeBird(): Bird {
  return {
    x: SLING.anchorX, y: SLING.anchorY,
    vx: 0, vy: 0,
    radius: BIRD_RADIUS,
    state: 'ready',
    bounces: 0,
  };
}

function makeEntities(levelIdx: number): Entity[] {
  const def = LEVELS[levelIdx % LEVELS.length];
  return def.entities.map((e, i) => ({
    ...e,
    id: i,
    hp: ENTITY_HP[e.type],
    maxHp: ENTITY_HP[e.type],
    dead: false,
  }));
}

export function initialGameState(levelIdx = 0): GameState {
  const def = LEVELS[levelIdx % LEVELS.length];
  return {
    phase: 'aiming',
    level: levelIdx,
    score: 0,
    birdsLeft: def.birds - 1, // current bird is the -1
    bird: makeBird(),
    entities: makeEntities(levelIdx),
    particles: [],
    pull: null,
    settleTimer: 0,
    justKilled: [],
  };
}

// ─── Update ────────────────────────────────────────────────────────────────────

export function updateGame(state: GameState, pinch: PinchData, deltaMs: number): {
  state: GameState;
  events: { type: 'hit' | 'break' | 'oink' | 'launch' | 'win' | 'lose' }[];
} {
  const events: { type: 'hit' | 'break' | 'oink' | 'launch' | 'win' | 'lose' }[] = [];

  switch (state.phase) {
    case 'aiming':     return { state: updateAiming(state, pinch), events };
    case 'pulling':    return updatePulling(state, pinch, events);
    case 'flying':     return updateFlying(state, deltaMs, events);
    case 'settling':   return { state: updateSettling(state, deltaMs), events };
    default:           return { state, events };
  }
}

function updateAiming(state: GameState, pinch: PinchData): GameState {
  if (!pinch.detected || !pinch.pinching) return state;
  // Check if pinch midpoint is within grab radius of anchor
  const handCanvasX = pinch.x * CANVAS_W;
  const handCanvasY = pinch.y * CANVAS_H;
  if (dist2(handCanvasX, handCanvasY, SLING.anchorX, SLING.anchorY) <= SLING.grabRadius) {
    return { ...state, phase: 'pulling', pull: { x: SLING.anchorX, y: SLING.anchorY } };
  }
  return state;
}

function updatePulling(
  state: GameState,
  pinch: PinchData,
  events: { type: 'hit' | 'break' | 'oink' | 'launch' | 'win' | 'lose' }[]
): { state: GameState; events: typeof events } {
  if (!pinch.detected) {
    // Lost tracking — cancel pull
    return { state: { ...state, phase: 'aiming', pull: null, bird: makeBird() }, events };
  }

  if (!pinch.pinching) {
    // Released — launch!
    const pull = state.pull ?? { x: SLING.anchorX, y: SLING.anchorY };
    const pullDX = pull.x - SLING.anchorX;
    const pullDY = pull.y - SLING.anchorY;
    const pullDist = Math.sqrt(pullDX * pullDX + pullDY * pullDY);
    if (pullDist < 10) {
      // Barely pulled — cancel
      return { state: { ...state, phase: 'aiming', pull: null, bird: makeBird() }, events };
    }
    const vx = -pullDX * LAUNCH_POWER;
    const vy = -pullDY * LAUNCH_POWER;
    events.push({ type: 'launch' });
    return {
      state: {
        ...state,
        phase: 'flying',
        pull: null,
        bird: { ...state.bird, x: pull.x, y: pull.y, vx, vy, state: 'flying' },
      },
      events,
    };
  }

  // Still pulling — update bird position clamped to max pull
  const handX = pinch.x * CANVAS_W;
  const handY = pinch.y * CANVAS_H;
  const clamped = clampPull(handX, handY);
  return {
    state: {
      ...state,
      pull: clamped,
      bird: { ...state.bird, x: clamped.x, y: clamped.y },
    },
    events,
  };
}

function updateFlying(
  state: GameState,
  _deltaMs: number,
  events: { type: 'hit' | 'break' | 'oink' | 'launch' | 'win' | 'lose' }[]
): { state: GameState; events: typeof events } {
  let bird = { ...state.bird };
  let entities = state.entities.map(e => ({ ...e }));
  let particles = [...state.particles];
  let score = state.score;
  let phase: GamePhase = 'flying';

  // Physics step
  bird.vy += GRAVITY;
  bird.x += bird.vx;
  bird.y += bird.vy;

  // Ground collision
  if (bird.y + bird.radius >= GROUND_Y) {
    bird.y = GROUND_Y - bird.radius;
    bird.vy = -Math.abs(bird.vy) * GROUND_BOUNCE;
    bird.vx *= GROUND_FRICTION;
    bird.bounces++;
    if (Math.abs(bird.vy) < STOP_THRESHOLD && Math.abs(bird.vx) < STOP_THRESHOLD || bird.bounces >= 3) {
      bird.vy = 0; bird.vx = 0; bird.state = 'stopped';
    }
  }

  // Left/right wall clamp
  if (bird.x - bird.radius < 0) { bird.x = bird.radius; bird.vx = Math.abs(bird.vx) * 0.5; }
  if (bird.x + bird.radius > CANVAS_W) { bird.x = CANVAS_W - bird.radius; bird.vx = -Math.abs(bird.vx) * 0.5; }
  if (bird.y + bird.radius < 0) { bird.y = bird.radius; bird.vy = Math.abs(bird.vy) * 0.3; }

  // Entity collisions
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.dead) continue;
    const col = circleRectCollide(bird, e);
    if (!col) continue;

    // Push bird out
    const overlap = bird.radius - Math.sqrt((bird.x - Math.max(e.x, Math.min(bird.x, e.x + e.w))) ** 2 + (bird.y - Math.max(e.y, Math.min(bird.y, e.y + e.h))) ** 2);
    bird.x += col.nx * overlap;
    bird.y += col.ny * overlap;
    const dot = bird.vx * col.nx + bird.vy * col.ny;
    bird.vx -= 1.6 * dot * col.nx;
    bird.vy -= 1.6 * dot * col.ny;
    bird.vx *= 0.65;
    bird.vy *= 0.65;

    events.push({ type: 'hit' });

    if (col.impact >= BREAK_FORCE[e.type]) {
      e.hp--;
      if (e.hp <= 0) {
        e.dead = true;
        const color = e.type === 'pig' ? '#4CAF50'
          : e.type === 'wood' ? '#8B5E3C'
          : e.type === 'glass' ? '#a0d8ef'
          : '#888';
        particles = particles.concat(spawnParticles(e.x + e.w / 2, e.y + e.h / 2, color, 12));
        if (e.type === 'pig') {
          events.push({ type: 'oink' });
          score += 500;
        } else {
          events.push({ type: 'break' });
          score += e.type === 'stone' ? 150 : e.type === 'glass' ? 50 : 100;
        }
      }
    }
  }

  // Bird stopped?
  if (bird.state === 'stopped') {
    phase = 'settling';
  }

  // Update particles
  particles = particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.18,
      vx: p.vx * 0.96,
      life: p.life - 0.035,
    }))
    .filter(p => p.life > 0);

  const allPigsDead = entities.filter(e => e.type === 'pig').every(e => e.dead);
  if (allPigsDead) {
    // Bonus for remaining birds
    score += state.birdsLeft * 1000;
    phase = 'levelComplete';
    events.push({ type: 'win' });
  }

  return {
    state: { ...state, bird, entities, particles, score, phase, settleTimer: phase === 'settling' ? 1800 : 0 },
    events,
  };
}

function updateSettling(state: GameState, deltaMs: number): GameState {
  const newTimer = state.settleTimer - deltaMs;
  if (newTimer > 0) {
    // Keep updating particles
    const particles = state.particles
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.18, vx: p.vx * 0.96, life: p.life - 0.035 }))
      .filter(p => p.life > 0);
    return { ...state, settleTimer: newTimer, particles };
  }

  // Check game state
  const allPigsDead = state.entities.filter(e => e.type === 'pig').every(e => e.dead);
  if (allPigsDead) {
    const score = state.score + state.birdsLeft * 1000;
    return { ...state, score, phase: 'levelComplete' };
  }
  if (state.birdsLeft <= 0) {
    return { ...state, phase: 'gameOver' };
  }
  // Next bird
  return {
    ...state,
    phase: 'aiming',
    birdsLeft: state.birdsLeft - 1,
    bird: makeBird(),
    particles: [],
    settleTimer: 0,
  };
}

// Advance to next level
export function nextLevel(state: GameState): GameState {
  const nextIdx = (state.level + 1) % LEVELS.length;
  const def = LEVELS[nextIdx];
  return {
    phase: 'aiming',
    level: nextIdx,
    score: state.score,
    birdsLeft: def.birds - 1,
    bird: makeBird(),
    entities: makeEntities(nextIdx),
    particles: [],
    pull: null,
    settleTimer: 0,
    justKilled: [],
  };
}

// Compute trajectory preview dots
export function getTrajectory(pullX: number, pullY: number, steps = 28): { x: number; y: number }[] {
  const pullDX = pullX - SLING.anchorX;
  const pullDY = pullY - SLING.anchorY;
  let vx = -pullDX * LAUNCH_POWER;
  let vy = -pullDY * LAUNCH_POWER;
  let x = pullX;
  let y = pullY;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
    points.push({ x, y });
    if (y > GROUND_Y + 20) break;
  }
  return points;
}
