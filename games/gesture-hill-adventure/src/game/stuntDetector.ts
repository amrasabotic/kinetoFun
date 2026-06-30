/**
 * Detects aerial stunts: flips, big jumps, perfect landings, and air time.
 * Tracks rotation accumulation while airborne.
 */
import type { Vehicle, FloatingText, StuntType } from '../types';
import {
  FLIP_THRESHOLD_RAD, BIG_JUMP_HEIGHT_PX, PERFECT_LAND_VEL_Y,
  SCORE_BACKFLIP, SCORE_FRONTFLIP, SCORE_DOUBLE_FLIP,
  SCORE_PERFECT_LAND, SCORE_BIG_JUMP, SCORE_AIRTIME_PER_S,
  CRASH_INVERT_MS,
} from '../constants/gameConfig';

let nextTextId = 0;

export interface StuntDetectorState {
  isAirborne:     boolean;
  airTimeMs:      number;
  totalAirTime:   number;   // cumulative seconds this run
  rotAccum:       number;   // radians accumulated while airborne
  lastAngle:      number;
  maxAirHeight:   number;   // peak height above terrain this jump
  flipsThisAir:   number;
  invertedMs:     number;   // time chassis has been upside-down
  totalFlips:     number;   // for statistics
  landed:         boolean;  // just landed this frame
}

export function createStuntDetector(): StuntDetectorState {
  return {
    isAirborne:   false,
    airTimeMs:    0,
    totalAirTime: 0,
    rotAccum:     0,
    lastAngle:    0,
    maxAirHeight: 0,
    flipsThisAir: 0,
    invertedMs:   0,
    totalFlips:   0,
    landed:       false,
  };
}

/**
 * Detect if vehicle wheels are off ground using terrain height.
 * Simple: if chassis Y is more than AIRBORNE_MIN_HEIGHT above terrain → airborne.
 */
export function updateStuntDetector(
  state:        StuntDetectorState,
  vehicle:      Vehicle,
  terrainYAtX:  number,   // terrain surface Y under the vehicle
  dt:           number,   // ms
  floatingTexts: FloatingText[],
  onScore:      (pts: number) => void,
  onFlip:       () => void,
): void {
  const { chassis } = vehicle;
  const cx = chassis.position.x;
  const cy = chassis.position.y;

  // Airborne check: chassis bottom above terrain surface
  const bottomY    = cy + 20;  // approx bottom of chassis
  const wasAir     = state.isAirborne;
  const nowAir     = bottomY < terrainYAtX - 8;
  const angle      = chassis.angle;
  const velY       = chassis.velocity.y;

  // Track inversion (crash detect)
  const isInverted = Math.abs(normaliseAngle(angle)) > Math.PI * 0.65;
  if (isInverted && !nowAir) {
    state.invertedMs += dt;
  } else {
    state.invertedMs = 0;
  }

  state.landed = false;

  if (nowAir) {
    if (!wasAir) {
      // Just left ground
      state.rotAccum     = 0;
      state.flipsThisAir = 0;
      state.maxAirHeight = 0;
      state.lastAngle    = angle;
    }

    state.isAirborne = true;
    state.airTimeMs += dt;

    // Track rotation accumulated in the air
    let dAngle = normaliseAngle(angle - state.lastAngle);
    state.rotAccum += dAngle;
    state.lastAngle = angle;

    // Count flips
    const fullFlips = Math.floor(Math.abs(state.rotAccum) / FLIP_THRESHOLD_RAD);
    if (fullFlips > state.flipsThisAir) {
      const newFlips = fullFlips - state.flipsThisAir;
      state.flipsThisAir = fullFlips;
      state.totalFlips  += newFlips;

      // Score per flip
      const isBack   = state.rotAccum > 0;
      for (let i = 0; i < newFlips; i++) {
        const pts = (fullFlips >= 2 ? SCORE_DOUBLE_FLIP : (isBack ? SCORE_BACKFLIP : SCORE_FRONTFLIP));
        onScore(pts);
        onFlip();
        spawnText(
          floatingTexts, cx, cy - 80,
          fullFlips >= 2
            ? (isBack ? '✨ DOUBLE BACKFLIP!' : '✨ DOUBLE FRONTFLIP!')
            : (isBack ? '🔄 BACKFLIP!'        : '🔄 FRONTFLIP!'),
          pts >= SCORE_DOUBLE_FLIP ? '#FF4081' : '#FF9800',
        );
      }
    }

    // Track peak height
    const heightAboveTerrain = terrainYAtX - cy;
    if (heightAboveTerrain > state.maxAirHeight) {
      state.maxAirHeight = heightAboveTerrain;
    }

  } else if (wasAir && !nowAir) {
    // Just landed
    state.isAirborne = false;
    state.landed     = true;

    const airSecs = state.airTimeMs / 1000;
    state.totalAirTime += airSecs;

    // Air-time bonus
    if (airSecs > 0.8) {
      const pts = Math.floor(airSecs * SCORE_AIRTIME_PER_S);
      onScore(pts);
      spawnText(floatingTexts, cx, cy - 60, `⏱ ${airSecs.toFixed(1)}s AIR TIME!`, '#64B5F6', pts);
    }

    // Big jump bonus
    if (state.maxAirHeight > BIG_JUMP_HEIGHT_PX) {
      onScore(SCORE_BIG_JUMP);
      spawnText(floatingTexts, cx, cy - 100, '🚀 BIG JUMP!', '#FFE878', SCORE_BIG_JUMP);
    }

    // Perfect landing (low downward velocity on landing)
    if (Math.abs(velY) < PERFECT_LAND_VEL_Y && state.airTimeMs > 600) {
      onScore(SCORE_PERFECT_LAND);
      spawnText(floatingTexts, cx, cy - 80, '🎯 PERFECT LANDING!', '#69F0AE', SCORE_PERFECT_LAND);
    }

    state.airTimeMs    = 0;
    state.rotAccum     = 0;
    state.flipsThisAir = 0;
    state.maxAirHeight = 0;
  } else {
    state.isAirborne = false;
    state.airTimeMs  = 0;
  }
}

/** True if vehicle has been upside-down long enough to count as crashed. */
export function isInvertCrash(state: StuntDetectorState): boolean {
  return state.invertedMs >= CRASH_INVERT_MS;
}

// ── Floating text helpers ─────────────────────────────────────────────────────

function spawnText(
  list:   FloatingText[],
  x:      number,
  y:      number,
  text:   string,
  color:  string,
  _pts?:  number,
): void {
  list.push({
    id:    nextTextId++,
    text,
    x,
    y,
    color,
    life:  1,
    scale: 1,
    vy:    -1.2,
  });
  if (list.length > 20) list.shift();
}

export function spawnScoreText(
  list:  FloatingText[],
  x:     number,
  y:     number,
  text:  string,
  color: string,
): void {
  spawnText(list, x, y, text, color);
}

export function updateFloatingTexts(list: FloatingText[], dt: number): void {
  const sec = dt / 1000;
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    t.y   += t.vy * dt * 0.04;
    t.life -= sec * 0.9;
    t.scale = 1 + (1 - t.life) * 0.3;
    if (t.life <= 0) list.splice(i, 1);
  }
}

export function renderFloatingTexts(
  ctx:    CanvasRenderingContext2D,
  texts:  FloatingText[],
): void {
  for (const t of texts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.life);
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);
    ctx.font         = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(t.text, 2, 2);

    ctx.fillStyle = t.color;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseAngle(a: number): number {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
