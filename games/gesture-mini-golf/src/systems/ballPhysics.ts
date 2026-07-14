import type { HoleDef, Obstacle } from '../types';

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface StepResult {
  ball: BallState;
  holed: boolean;
  inWater: boolean;
  stopped: boolean; // true once the ball should stop simulating this stroke (rest, holed, or water)
}

const BASE_FRICTION = 1.4; // per-second exponential speed decay
const SAND_FRICTION_MULT = 3.2;
const SLOPE_ACCEL = 0.9; // units/sec^2 applied while inside a slope obstacle
const STOP_SPEED = 0.02; // units/sec below which the ball is considered at rest
const HOLE_CAPTURE_SPEED = 0.6; // must be rolling slower than this to drop in
const WALL_RESTITUTION = 0.65;

export const MAX_PUTT_SPEED = 1.9; // units/sec at full power, before difficulty scaling

function pointInRect(x: number, y: number, o: Obstacle): boolean {
  return x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
}

/** Simplified AABB reflection: push the ball out along whichever edge it penetrated least, flipping that velocity axis. */
function reflectOffWall(x: number, y: number, vx: number, vy: number, wall: Obstacle): BallState {
  if (!pointInRect(x, y, wall)) return { x, y, vx, vy };
  const penLeft = x - wall.x;
  const penRight = wall.x + wall.w - x;
  const penTop = y - wall.y;
  const penBottom = wall.y + wall.h - y;
  const minPen = Math.min(penLeft, penRight, penTop, penBottom);

  if (minPen === penLeft) return { x: wall.x, y, vx: -vx * WALL_RESTITUTION, vy };
  if (minPen === penRight) return { x: wall.x + wall.w, y, vx: -vx * WALL_RESTITUTION, vy };
  if (minPen === penTop) return { x, y: wall.y, vx, vy: -vy * WALL_RESTITUTION };
  return { x, y: wall.y + wall.h, vx, vy: -vy * WALL_RESTITUTION };
}

/**
 * Advances the ball one fixed timestep: slope acceleration, sand/base
 * friction decay, wall/boundary bounces, then checks whether the stroke is
 * over (holed, sunk in water, or naturally come to rest). A deliberate
 * simplification over full rigid-body physics — same "approximate the read,
 * keep the code simple" tradeoff documented for other games in this catalog.
 */
export function stepBall(ball: BallState, hole: HoleDef, dtSeconds: number, frictionScale = 1): StepResult {
  let { x, y, vx, vy } = ball;

  const sand = hole.obstacles.find((o) => o.kind === 'sand' && pointInRect(x, y, o));
  const slope = hole.obstacles.find((o) => o.kind === 'slope' && pointInRect(x, y, o));

  if (slope) {
    vx += (slope.dx ?? 0) * SLOPE_ACCEL * dtSeconds;
    vy += (slope.dy ?? 0) * SLOPE_ACCEL * dtSeconds;
  }

  const friction = BASE_FRICTION * frictionScale * (sand ? SAND_FRICTION_MULT : 1);
  const decay = Math.max(0, 1 - friction * dtSeconds);
  vx *= decay;
  vy *= decay;

  x += vx * dtSeconds;
  y += vy * dtSeconds;

  for (const wall of hole.obstacles) {
    if (wall.kind !== 'wall') continue;
    ({ x, y, vx, vy } = reflectOffWall(x, y, vx, vy, wall));
  }

  if (x < 0) {
    x = 0;
    vx = -vx * WALL_RESTITUTION;
  } else if (x > 1) {
    x = 1;
    vx = -vx * WALL_RESTITUTION;
  }
  if (y < 0) {
    y = 0;
    vy = -vy * WALL_RESTITUTION;
  } else if (y > 1) {
    y = 1;
    vy = -vy * WALL_RESTITUTION;
  }

  const speed = Math.hypot(vx, vy);
  const distToCup = Math.hypot(x - hole.cup.x, y - hole.cup.y);
  const holed = distToCup <= hole.cupRadius && speed <= HOLE_CAPTURE_SPEED;
  const inWater = hole.obstacles.some((o) => o.kind === 'water' && pointInRect(x, y, o));
  const stopped = holed || inWater || speed <= STOP_SPEED;

  return { ball: { x, y, vx, vy }, holed, inWater, stopped };
}

export function initialBallState(hole: HoleDef): BallState {
  return { x: hole.tee.x, y: hole.tee.y, vx: 0, vy: 0 };
}
