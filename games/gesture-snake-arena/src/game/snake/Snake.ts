import type { PlayerSnakeState, Segment, ActivePowerUp } from '../../types';
import {
  SEGMENT_DISTANCE, INITIAL_LENGTH, PLAYER_BASE_SPEED,
  PLAYER_MAX_SPEED, PLAYER_BOOST_SPEED, BOOST_COOLDOWN_MS,
  BOOST_LENGTH_DRAIN, TURN_SPEED, MIN_SNAKE_LENGTH, ARENA_WIDTH, ARENA_HEIGHT,
} from '../../constants/gameConfig';
import { lerpAngle, clamp } from '../../utils/mathUtils';

let _nextId = 0;

/** Build initial segment chain from head position */
export function buildSegments(headX: number, headY: number, angle: number, count: number): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < count; i++) {
    segs.push({
      x: headX - Math.cos(angle) * i * SEGMENT_DISTANCE,
      y: headY - Math.sin(angle) * i * SEGMENT_DISTANCE,
    });
  }
  return segs;
}

export function createPlayerSnake(skinColors: string[]): PlayerSnakeState {
  void skinColors; // used by renderer
  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  const angle = Math.random() * Math.PI * 2;
  return {
    segments: buildSegments(cx, cy, angle, INITIAL_LENGTH),
    angle,
    speed: PLAYER_BASE_SPEED,
    targetAngle: angle,
    boosting: false,
    boostCooldown: 0,
    alive: true,
    blinkTimer: 3000,
    blinkOpen: true,
    mouthOpen: 0,
    wavePhase: 0,
    score: 0,
    length: INITIAL_LENGTH,
    combo: 1,
    comboTimer: 0,
    shieldActive: false,
    ghostActive: false,
    magnetActive: false,
    activePowerUps: [],
    boostsUsed: 0,
  };
}

export function updatePlayerSnake(
  snake: PlayerSnakeState,
  dirX: number,
  dirY: number,
  magnitude: number,
  boostInput: boolean,
  dt: number,         // ms
): void {
  if (!snake.alive) return;

  const dtS = dt / 1000;

  // ── Boost ────────────────────────────────────────────────────────────────────
  if (snake.boostCooldown > 0) snake.boostCooldown -= dt;

  const wasBoosting = snake.boosting;
  snake.boosting = boostInput && snake.boostCooldown <= 0 && snake.segments.length > MIN_SNAKE_LENGTH + 2;

  if (wasBoosting && !snake.boosting && boostInput && snake.boostCooldown <= 0) {
    snake.boostCooldown = BOOST_COOLDOWN_MS;
  }
  if (!wasBoosting && snake.boosting) {
    snake.boostsUsed++;
  }

  // ── Speed ────────────────────────────────────────────────────────────────────
  const baseSpeed = snake.boosting
    ? PLAYER_BOOST_SPEED
    : PLAYER_BASE_SPEED + (PLAYER_MAX_SPEED - PLAYER_BASE_SPEED) * magnitude;
  snake.speed = baseSpeed;

  // ── Steering ─────────────────────────────────────────────────────────────────
  if (magnitude > 0.05) {
    const desired = Math.atan2(dirY, dirX);
    snake.angle = lerpAngle(snake.angle, desired, TURN_SPEED * (dt / 16.67));
  }

  // ── Movement ─────────────────────────────────────────────────────────────────
  const head = snake.segments[0];
  const newHead: Segment = {
    x: head.x + Math.cos(snake.angle) * snake.speed,
    y: head.y + Math.sin(snake.angle) * snake.speed,
  };

  // Soft boundary repulsion
  const margin = 60;
  if (newHead.x < margin) newHead.x = margin;
  if (newHead.x > ARENA_WIDTH  - margin) newHead.x = ARENA_WIDTH  - margin;
  if (newHead.y < margin) newHead.y = margin;
  if (newHead.y > ARENA_HEIGHT - margin) newHead.y = ARENA_HEIGHT - margin;

  snake.segments.unshift(newHead);

  // Drain length while boosting
  if (snake.boosting) {
    snake.length = Math.max(MIN_SNAKE_LENGTH, snake.length - BOOST_LENGTH_DRAIN);
  }

  // Trim tail to target length
  const targetCount = Math.round(snake.length) * 2;
  while (snake.segments.length > targetCount) snake.segments.pop();

  // ── Animations ───────────────────────────────────────────────────────────────
  snake.wavePhase += dtS * 3;
  snake.blinkTimer -= dt;
  if (snake.blinkTimer <= 0) {
    snake.blinkOpen = !snake.blinkOpen;
    snake.blinkTimer = snake.blinkOpen ? 3000 + Math.random() * 2000 : 150;
  }
  snake.mouthOpen = Math.max(0, snake.mouthOpen - dtS * 3);

  // ── Combo timer ──────────────────────────────────────────────────────────────
  if (snake.comboTimer > 0) {
    snake.comboTimer -= dt;
    if (snake.comboTimer <= 0) snake.combo = 1;
  }

  // ── Power-up timers ──────────────────────────────────────────────────────────
  snake.activePowerUps = snake.activePowerUps.filter(p => {
    p.remaining -= dt;
    return p.remaining > 0;
  });
  snake.shieldActive  = snake.activePowerUps.some(p => p.type === 'shield');
  snake.ghostActive   = snake.activePowerUps.some(p => p.type === 'ghost');
  snake.magnetActive  = snake.activePowerUps.some(p => p.type === 'magnet');
}

export function growSnake(snake: PlayerSnakeState, amount: number): void {
  snake.length += amount;
  snake.mouthOpen = 1;
}

export function addPowerUp(snake: PlayerSnakeState, pu: ActivePowerUp): void {
  const existing = snake.activePowerUps.find(p => p.type === pu.type);
  if (existing) {
    existing.remaining = pu.total;
  } else {
    snake.activePowerUps.push({ ...pu });
  }
}

export function killPlayerSnake(snake: PlayerSnakeState): void {
  snake.alive = false;
}
