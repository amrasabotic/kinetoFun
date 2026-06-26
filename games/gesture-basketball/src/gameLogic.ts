// ── Canvas / court constants ──────────────────────────────────────────────────

export const CANVAS_W  = 800;
export const CANVAS_H  = 500;
export const FLOOR_Y   = 458;

// Player (stick figure, side view)
export const PLAYER_X      = 140;
export const PLAYER_FOOT_Y = FLOOR_Y;
export const BALL_START_X  = 164;
export const BALL_START_Y  = 360;   // ball held at shoulder height

// Hoop geometry
export const HOOP_CX         = 625;   // rim center X
export const HOOP_Y          = 200;   // rim Y
export const RIM_LEFT        = 588;   // near rim post X
export const RIM_RIGHT       = 662;   // far rim post X (backboard side)
export const BACKBOARD_X1    = 657;   // backboard left edge
export const BACKBOARD_X2    = 672;   // backboard right edge
export const BACKBOARD_Y1    = 128;   // backboard top
export const BACKBOARD_Y2    = 265;   // backboard bottom

// Physics
export const BALL_R          = 14;
export const GRAVITY         = 0.40;

// Launch angle: 30° + aimX * 50° (aimX=0.5 → 55°, ideal for this geometry)
export const AIM_ANGLE_MIN   = 30 * (Math.PI / 180);
export const AIM_ANGLE_RANGE = 50 * (Math.PI / 180);

// Speed: 12 + power * 9 (sweet spot ~0.47 → speed~16.2 for perfect arc)
export const SPEED_MIN   = 12;
export const SPEED_RANGE = 9;

// Game rules
export const MAX_SHOTS         = 10;
export const POINTS_PER_BASKET = 10;
export const RESULT_PAUSE_MS   = 1400;  // pause after each shot result

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GamePhase =
  | 'aiming'        // player is positioning hand, power meter oscillates
  | 'in_flight'     // ball is arcing toward hoop
  | 'result_score'  // scored — brief celebration
  | 'result_miss'   // missed — brief sad pause
  | 'game_over';

export type AudioTrigger =
  | 'shoot'
  | 'swish'
  | 'bank'
  | 'miss_rim'
  | 'miss_air'
  | 'crowd_cheer'
  | 'gameover'
  | null;

export interface Ball {
  x:  number;
  y:  number;
  vx: number;
  vy: number;
}

export interface BasketGestureInput {
  aimX:         number;  // 0–1, mirrored wrist X
  handDetected: boolean;
  shootFired:   boolean; // edge-triggered raise
}

// Per-difficulty tuning
interface DifficultyConfig {
  scoreRadius:    number;  // proximity to HOOP center to count as scored (px)
  powerPeriodMs:  number;  // ms for one full power-meter oscillation
}

export const DIFF_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { scoreRadius: 50, powerPeriodMs: 4000 },
  normal: { scoreRadius: 33, powerPeriodMs: 2600 },
  hard:   { scoreRadius: 18, powerPeriodMs: 1800 },
};

export interface GameState {
  phase:        GamePhase;
  ball:         Ball;
  shotsTotal:   number;   // shots taken so far
  score:        number;
  powerPhase:   number;   // radians, 0 → 2π per cycle; power = 0.5+0.5*sin(powerPhase)
  powerValue:   number;   // 0–1 derived from powerPhase
  aimAngle:     number;   // current launch angle (radians) from gesture
  difficulty:   Difficulty;
  phaseTimer:   number;   // ms remaining in result pause
  bankedShot:   boolean;  // ball bounced off backboard during this flight
  audioTrigger: AudioTrigger;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function aimAngleFromX(aimX: number): number {
  return AIM_ANGLE_MIN + clamp(aimX, 0, 1) * AIM_ANGLE_RANGE;
}

export function speedFromPower(power: number): number {
  return SPEED_MIN + power * SPEED_RANGE;
}

export function ballAtStart(): Ball {
  return { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0 };
}

// ── Initial state ─────────────────────────────────────────────────────────────

export function initialGameState(difficulty: Difficulty): GameState {
  return {
    phase:        'aiming',
    ball:         ballAtStart(),
    shotsTotal:   0,
    score:        0,
    powerPhase:   -Math.PI / 2,   // starts at power=0 (sin(-π/2) = -1 → power=0)
    powerValue:   0,
    aimAngle:     aimAngleFromX(0.5),
    difficulty,
    phaseTimer:   0,
    bankedShot:   false,
    audioTrigger: null,
  };
}

// ── Pre-visualise arc ─────────────────────────────────────────────────────────

export interface ArcPoint { x: number; y: number }

export function previewArc(aimX: number, power: number, steps = 80): ArcPoint[] {
  const angle = aimAngleFromX(aimX);
  const speed = speedFromPower(power);
  const vx    = speed * Math.cos(angle);
  const vy    = -speed * Math.sin(angle);

  const pts: ArcPoint[] = [];
  let bx = BALL_START_X;
  let by = BALL_START_Y;
  let bvx = vx;
  let bvy = vy;

  for (let i = 0; i < steps; i++) {
    bvy = Math.min(bvy + GRAVITY, 25);
    bx += bvx;
    by += bvy;
    if (by > FLOOR_Y || bx > CANVAS_W + 50) break;
    if (i % 4 === 0) pts.push({ x: bx, y: by });
  }
  return pts;
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function stepGame(
  state:   GameState,
  dtMs:    number,
  gesture: BasketGestureInput,
): GameState {
  if (state.phase === 'game_over') return state;

  const dt = dtMs / 16.67;  // normalised delta (1.0 = one 60-fps frame)

  // ── Result pause ─────────────────────────────────────────────────────────
  if (state.phase === 'result_score' || state.phase === 'result_miss') {
    const remaining = state.phaseTimer - dtMs;
    if (remaining <= 0) {
      if (state.shotsTotal >= MAX_SHOTS) {
        return { ...state, phase: 'game_over', phaseTimer: 0, audioTrigger: 'gameover' };
      }
      return {
        ...state,
        phase:        'aiming',
        ball:         ballAtStart(),
        phaseTimer:   0,
        bankedShot:   false,
        audioTrigger: null,
      };
    }
    return { ...state, phaseTimer: remaining, audioTrigger: null };
  }

  // ── Aiming phase ─────────────────────────────────────────────────────────
  if (state.phase === 'aiming') {
    const cfg       = DIFF_CONFIG[state.difficulty];
    const dPhase    = (dtMs / cfg.powerPeriodMs) * Math.PI * 2;
    const newPhase  = state.powerPhase + dPhase;
    const newPower  = 0.5 + 0.5 * Math.sin(newPhase);
    const newAngle  = gesture.handDetected
      ? aimAngleFromX(gesture.aimX)
      : state.aimAngle;

    // Shoot triggered by edge-triggered raise
    if (gesture.shootFired) {
      const angle = newAngle;
      const speed = speedFromPower(newPower);
      const vx    = speed * Math.cos(angle);
      const vy    = -speed * Math.sin(angle);

      return {
        ...state,
        phase:        'in_flight',
        ball:         { x: BALL_START_X, y: BALL_START_Y, vx, vy },
        shotsTotal:   state.shotsTotal + 1,
        powerPhase:   newPhase,
        powerValue:   newPower,
        aimAngle:     angle,
        bankedShot:   false,
        audioTrigger: 'shoot',
      };
    }

    return {
      ...state,
      powerPhase:   newPhase,
      powerValue:   newPower,
      aimAngle:     newAngle,
      audioTrigger: null,
    };
  }

  // ── In-flight phase ───────────────────────────────────────────────────────
  if (state.phase === 'in_flight') {
    let { x, y, vx, vy } = state.ball;
    let banked = state.bankedShot;
    let audioTrigger: AudioTrigger = null;

    vy = Math.min(vy + GRAVITY * dt, 25);
    x += vx * dt;
    y += vy * dt;

    // Backboard bounce (ball is descending or ascending into the board)
    if (
      x + BALL_R >= BACKBOARD_X1 &&
      x - BALL_R <= BACKBOARD_X2 &&
      y >= BACKBOARD_Y1 &&
      y <= BACKBOARD_Y2 &&
      vx > 0
    ) {
      x  = BACKBOARD_X1 - BALL_R;
      vx = -Math.abs(vx) * 0.58;
      banked = true;
      audioTrigger = 'miss_rim';
    }

    // Side walls (shouldn't happen but safety)
    if (x - BALL_R < 0) { x = BALL_R; vx = Math.abs(vx) * 0.5; }

    const cfg  = DIFF_CONFIG[state.difficulty];
    const dist = Math.hypot(x - HOOP_CX, y - HOOP_Y);

    // Score check: ball passes near hoop center while descending
    if (vy > 0 && dist < cfg.scoreRadius) {
      const scoredPts = state.score + POINTS_PER_BASKET;
      return {
        ...state,
        ball:         { x, y, vx, vy },
        score:        scoredPts,
        phase:        'result_score',
        phaseTimer:   RESULT_PAUSE_MS,
        bankedShot:   banked,
        audioTrigger: banked ? 'bank' : 'swish',
      };
    }

    // Miss: ball hits floor or leaves canvas
    if (y + BALL_R >= FLOOR_Y || x > CANVAS_W + 60) {
      const nearRim = Math.abs(x - HOOP_CX) < 80;
      return {
        ...state,
        ball:         { x: clamp(x, -50, CANVAS_W + 60), y: Math.min(y, FLOOR_Y), vx, vy },
        phase:        'result_miss',
        phaseTimer:   RESULT_PAUSE_MS,
        bankedShot:   banked,
        audioTrigger: nearRim ? 'miss_rim' : 'miss_air',
      };
    }

    return { ...state, ball: { x, y, vx, vy }, bankedShot: banked, audioTrigger };
  }

  return state;
}
