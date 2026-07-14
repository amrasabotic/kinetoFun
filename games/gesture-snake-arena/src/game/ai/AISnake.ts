import type { AISnakeState, AIBehavior, Segment, EnergyOrb, PlayerSnakeState } from '../../types';
import {
  AI_NAMES, AI_SKIN_PALETTES, AI_INITIAL_LENGTH, AI_BASE_SPEED,
  AI_MAX_SPEED, AI_TURN_SPEED, AI_VISION_RADIUS, AI_BOOST_CHANCE,
  SEGMENT_DISTANCE, BOOST_COOLDOWN_MS, BOOST_LENGTH_DRAIN,
  MIN_SNAKE_LENGTH, ARENA_WIDTH, ARENA_HEIGHT,
} from '../../constants/gameConfig';
import { lerpAngle, dist2, randomRange, pick } from '../../utils/mathUtils';

let aiIdCounter = 1000;

const BEHAVIORS: AIBehavior[] = ['collector','hunter','defender','opportunist','wanderer'];

function buildAISegments(hx: number, hy: number, angle: number, count: number): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < count; i++) {
    segs.push({
      x: hx - Math.cos(angle) * i * SEGMENT_DISTANCE,
      y: hy - Math.sin(angle) * i * SEGMENT_DISTANCE,
    });
  }
  return segs;
}

export function createAISnake(index: number): AISnakeState {
  const id = aiIdCounter++;
  const margin = 200;
  const x = margin + Math.random() * (ARENA_WIDTH  - margin * 2);
  const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
  const angle = Math.random() * Math.PI * 2;
  const palette = AI_SKIN_PALETTES[index % AI_SKIN_PALETTES.length];
  const behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)];

  return {
    id,
    name: 'AI ' + (AI_NAMES[index % AI_NAMES.length]),
    segments: buildAISegments(x, y, angle, AI_INITIAL_LENGTH),
    angle,
    speed: AI_BASE_SPEED + Math.random(),
    targetAngle: angle,
    boosting: false,
    boostCooldown: 0,
    skinColors: palette,
    score: 0,
    behavior,
    behaviorTimer: 0,
    targetX: x,
    targetY: y,
    alive: true,
    length: AI_INITIAL_LENGTH,
    deathParticlesSent: false,
    wanderAngle: angle,
    wanderTimer: 0,
  };
}

export function updateAISnake(
  ai: AISnakeState,
  orbs: EnergyOrb[],
  player: PlayerSnakeState,
  allAI: AISnakeState[],
  dt: number,
): void {
  if (!ai.alive) return;
  const dtS = dt / 1000;

  // ── Boost cooldown ────────────────────────────────────────────────────────
  if (ai.boostCooldown > 0) ai.boostCooldown -= dt;

  // ── Pick target based on behavior ─────────────────────────────────────────
  ai.behaviorTimer -= dt;
  if (ai.behaviorTimer <= 0) {
    ai.behaviorTimer = 800 + Math.random() * 1200;
    pickTarget(ai, orbs, player, allAI);
  }

  // Wander drift
  if (ai.behavior === 'wanderer' || (ai.targetX === 0 && ai.targetY === 0)) {
    ai.wanderTimer -= dt;
    if (ai.wanderTimer <= 0) {
      ai.wanderTimer = 1500 + Math.random() * 2000;
      ai.wanderAngle += randomRange(-1.2, 1.2);
    }
    const wanderDist = 200;
    ai.targetX = ai.segments[0].x + Math.cos(ai.wanderAngle) * wanderDist;
    ai.targetY = ai.segments[0].y + Math.sin(ai.wanderAngle) * wanderDist;
  }

  // ── Steer toward target ────────────────────────────────────────────────────
  const head = ai.segments[0];
  const dx = ai.targetX - head.x;
  const dy = ai.targetY - head.y;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    const desired = Math.atan2(dy, dx);
    ai.angle = lerpAngle(ai.angle, desired, AI_TURN_SPEED * (dt / 16.67));
  }

  // ── Boundary avoidance ─────────────────────────────────────────────────────
  const margin = 150;
  if (head.x < margin)              ai.angle = lerpAngle(ai.angle, 0, 0.15);
  if (head.x > ARENA_WIDTH  - margin) ai.angle = lerpAngle(ai.angle, Math.PI, 0.15);
  if (head.y < margin)              ai.angle = lerpAngle(ai.angle, Math.PI / 2, 0.15);
  if (head.y > ARENA_HEIGHT - margin) ai.angle = lerpAngle(ai.angle, -Math.PI / 2, 0.15);

  // ── Boost decision ─────────────────────────────────────────────────────────
  const mayBoost = ai.boostCooldown <= 0 && ai.length > MIN_SNAKE_LENGTH + 4;
  ai.boosting = mayBoost && Math.random() < AI_BOOST_CHANCE * (dt / 16.67);
  if (ai.boosting) ai.boostCooldown = BOOST_COOLDOWN_MS;

  // ── Speed ─────────────────────────────────────────────────────────────────
  const targetSpeed = ai.boosting
    ? AI_MAX_SPEED * 1.5
    : AI_BASE_SPEED + Math.random() * (AI_MAX_SPEED - AI_BASE_SPEED) * 0.5;
  ai.speed += (targetSpeed - ai.speed) * 0.05;

  // ── Move ──────────────────────────────────────────────────────────────────
  const newHead: Segment = {
    x: head.x + Math.cos(ai.angle) * ai.speed,
    y: head.y + Math.sin(ai.angle) * ai.speed,
  };
  newHead.x = Math.max(40, Math.min(ARENA_WIDTH  - 40, newHead.x));
  newHead.y = Math.max(40, Math.min(ARENA_HEIGHT - 40, newHead.y));

  ai.segments.unshift(newHead);

  if (ai.boosting) {
    ai.length = Math.max(MIN_SNAKE_LENGTH, ai.length - BOOST_LENGTH_DRAIN);
  }

  const targetCount = Math.round(ai.length) * 2;
  while (ai.segments.length > targetCount) ai.segments.pop();
}

function pickTarget(
  ai: AISnakeState,
  orbs: EnergyOrb[],
  player: PlayerSnakeState,
  allAI: AISnakeState[],
): void {
  const head = ai.segments[0];
  const vis2 = AI_VISION_RADIUS * AI_VISION_RADIUS;

  switch (ai.behavior) {
    case 'collector': {
      // Seek nearest orb
      let bestDist = Infinity;
      for (const orb of orbs) {
        const d = dist2(head.x, head.y, orb.x, orb.y);
        if (d < vis2 && d < bestDist) {
          bestDist = d;
          ai.targetX = orb.x; ai.targetY = orb.y;
        }
      }
      break;
    }
    case 'hunter': {
      // Chase smaller snakes
      const playerD = dist2(head.x, head.y, player.segments[0].x, player.segments[0].y);
      if (playerD < vis2 && player.length < ai.length && player.alive) {
        ai.targetX = player.segments[0].x;
        ai.targetY = player.segments[0].y;
        return;
      }
      for (const other of allAI) {
        if (other.id === ai.id || !other.alive) continue;
        const d = dist2(head.x, head.y, other.segments[0].x, other.segments[0].y);
        if (d < vis2 && other.length < ai.length * 0.8) {
          ai.targetX = other.segments[0].x;
          ai.targetY = other.segments[0].y;
          return;
        }
      }
      // Fallback: collect orbs
      pickNearestOrb(ai, orbs, vis2);
      break;
    }
    case 'defender': {
      // Stay in center area, collect nearby orbs
      const centerDist2 = dist2(head.x, head.y, ARENA_WIDTH/2, ARENA_HEIGHT/2);
      if (centerDist2 > 800*800) {
        ai.targetX = ARENA_WIDTH/2 + randomRange(-300, 300);
        ai.targetY = ARENA_HEIGHT/2 + randomRange(-300, 300);
        return;
      }
      pickNearestOrb(ai, orbs, vis2);
      break;
    }
    case 'opportunist': {
      // Collect orbs but flee from bigger snakes
      const bigSnake = allAI.find(o =>
        o.id !== ai.id && o.alive &&
        o.length > ai.length * 1.3 &&
        dist2(head.x, head.y, o.segments[0].x, o.segments[0].y) < (AI_VISION_RADIUS * 0.6) ** 2
      );
      if (bigSnake) {
        // Flee
        const fx = head.x - bigSnake.segments[0].x;
        const fy = head.y - bigSnake.segments[0].y;
        const fl = Math.sqrt(fx*fx + fy*fy) || 1;
        ai.targetX = head.x + (fx/fl) * 300;
        ai.targetY = head.y + (fy/fl) * 300;
        return;
      }
      pickNearestOrb(ai, orbs, vis2);
      break;
    }
    case 'wanderer':
    default:
      // Handled by wander logic above
      break;
  }
}

function pickNearestOrb(ai: AISnakeState, orbs: EnergyOrb[], vis2: number): void {
  const head = ai.segments[0];
  let best = Infinity;
  for (const orb of orbs) {
    const d = dist2(head.x, head.y, orb.x, orb.y);
    if (d < vis2 && d < best) {
      best = d;
      ai.targetX = orb.x; ai.targetY = orb.y;
    }
  }
}

export function respawnAISnake(ai: AISnakeState, index: number): void {
  const margin = 200;
  const x = margin + Math.random() * (ARENA_WIDTH  - margin * 2);
  const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
  const angle = Math.random() * Math.PI * 2;

  ai.segments = buildAISegments(x, y, angle, AI_INITIAL_LENGTH);
  ai.angle = angle;
  ai.targetAngle = angle;
  ai.alive = true;
  ai.length = AI_INITIAL_LENGTH;
  ai.score = 0;
  ai.boosting = false;
  ai.boostCooldown = 0;
  ai.deathParticlesSent = false;
  ai.behaviorTimer = 0;
  ai.targetX = x;
  ai.targetY = y;
}
