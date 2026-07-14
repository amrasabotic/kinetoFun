// ── Canvas / court constants ──────────────────────────────────────────────────

export const CANVAS_W  = 800;
export const CANVAS_H  = 500;
export const FLOOR_Y   = 440;

// Player
export const PLAYER_X      = 145;
export const PLAYER_FOOT_Y = FLOOR_Y;
export const BALL_START_X  = 168;
export const BALL_START_Y  = 355;   // held at shoulder height

// Hoop geometry (side-view, 2D)
export const HOOP_CX      = 625;   // rim center X
export const HOOP_Y       = 195;   // rim Y
export const RIM_LEFT     = 588;   // near rim post (player side)
export const RIM_RIGHT    = 662;   // far rim post (backboard side)
export const BACKBOARD_X1 = 657;
export const BACKBOARD_X2 = 674;
export const BACKBOARD_Y1 = 122;
export const BACKBOARD_Y2 = 268;

// Physics
export const BALL_R    = 14;
export const GRAVITY   = 0.40;

// Launch angle: AIM_MIN + aimX * AIM_RANGE
// aimX=0.5 → 55° — ideal arc from (168,355) to hoop center (625,195)
export const AIM_ANGLE_MIN   = 28 * (Math.PI / 180);
export const AIM_ANGLE_RANGE = 52 * (Math.PI / 180);

// Speed from power: SPEED_MIN + power * SPEED_RANGE
// Sweet spot: power≈0.47 → speed≈16.2 → perfect arc at 55°
export const SPEED_MIN   = 11;
export const SPEED_RANGE = 11;

// Game rules
export const MAX_SHOTS         = 10;
export const POINTS_PER_BASKET = 10;
export const RESULT_PAUSE_MS   = 1600;

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GamePhase =
  | 'aiming'
  | 'in_flight'
  | 'result_score'
  | 'result_miss'
  | 'game_over';

export type AudioTrigger =
  | 'shoot'
  | 'swish'
  | 'bank'
  | 'miss_rim'
  | 'miss_air'
  | 'gameover'
  | null;

export interface BasketGestureInput {
  aimX:         number;   // 0–1, mirrored wrist X
  handDetected: boolean;
  shootFired:   boolean;
  throwPower:   number;   // 0–1, rise-based throw power
  wristY:       number;   // 0–1 current wrist Y (for UI)
  chargeRatio:  number;   // 0–1 how charged the throw is (for UI)
}

export interface DifficultyConfig {
  scoreRadius: number;   // proximity to hoop center to score (px)
  label:       string;
}

export const DIFF_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { scoreRadius: 52, label: 'Easy'   },
  normal: { scoreRadius: 34, label: 'Normal' },
  hard:   { scoreRadius: 18, label: 'Hard'   },
};

export interface Ball { x: number; y: number; vx: number; vy: number }

export interface GameState {
  phase:        GamePhase;
  ball:         Ball;
  shotsTotal:   number;
  score:        number;
  aimAngle:     number;    // current launch angle (radians), for arc preview
  lastPower:    number;    // power used on last shot, for post-shot display
  difficulty:   Difficulty;
  phaseTimer:   number;
  bankedShot:   boolean;
  streak:       number;    // consecutive baskets
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
  return SPEED_MIN + clamp(power, 0, 1) * SPEED_RANGE;
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
    aimAngle:     aimAngleFromX(0.5),
    lastPower:    0.5,
    difficulty,
    phaseTimer:   0,
    bankedShot:   false,
    streak:       0,
    audioTrigger: null,
  };
}

// ── Arc preview ───────────────────────────────────────────────────────────────

export interface ArcPoint { x: number; y: number; t: number }

export function previewArc(aimX: number, power: number): ArcPoint[] {
  const angle = aimAngleFromX(aimX);
  const speed = speedFromPower(power);
  const vx0   = speed * Math.cos(angle);
  const vy0   = -speed * Math.sin(angle);

  const pts: ArcPoint[] = [];
  let bx = BALL_START_X, by = BALL_START_Y;
  let bvx = vx0, bvy = vy0;

  for (let i = 0; i < 90; i++) {
    bvy = Math.min(bvy + GRAVITY, 26);
    bx += bvx;
    by += bvy;
    if (by > FLOOR_Y + 20 || bx > CANVAS_W + 60) break;
    // Finer dots near ball, sparser further along
    const interval = i < 20 ? 2 : i < 50 ? 3 : 5;
    if (i % interval === 0) pts.push({ x: bx, y: by, t: i / 90 });
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

  const dt = dtMs / 16.67;

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
    const newAngle = gesture.handDetected
      ? aimAngleFromX(gesture.aimX)
      : state.aimAngle;

    if (gesture.shootFired) {
      const angle = newAngle;
      const speed = speedFromPower(gesture.throwPower);
      return {
        ...state,
        phase:        'in_flight',
        ball:         { x: BALL_START_X, y: BALL_START_Y, vx: speed * Math.cos(angle), vy: -speed * Math.sin(angle) },
        shotsTotal:   state.shotsTotal + 1,
        aimAngle:     angle,
        lastPower:    gesture.throwPower,
        bankedShot:   false,
        audioTrigger: 'shoot',
      };
    }

    return { ...state, aimAngle: newAngle, audioTrigger: null };
  }

  // ── In-flight phase ───────────────────────────────────────────────────────
  if (state.phase === 'in_flight') {
    let { x, y, vx, vy } = state.ball;
    let banked = state.bankedShot;
    let audio: AudioTrigger = null;

    vy = Math.min(vy + GRAVITY * dt, 26);
    x += vx * dt;
    y += vy * dt;

    // Backboard bounce
    if (x + BALL_R >= BACKBOARD_X1 && x - BALL_R <= BACKBOARD_X2 && y >= BACKBOARD_Y1 && y <= BACKBOARD_Y2 && vx > 0) {
      x  = BACKBOARD_X1 - BALL_R - 1;
      vx = -Math.abs(vx) * 0.55;
      banked = true;
      audio  = 'miss_rim';
    }

    if (x - BALL_R < 0) { x = BALL_R; vx = Math.abs(vx) * 0.5; }

    // Score check
    const cfg  = DIFF_CONFIG[state.difficulty];
    const dist = Math.hypot(x - HOOP_CX, y - HOOP_Y);
    if (vy > 0 && dist < cfg.scoreRadius) {
      return {
        ...state,
        ball:         { x, y, vx, vy },
        score:        state.score + POINTS_PER_BASKET,
        streak:       state.streak + 1,
        phase:        'result_score',
        phaseTimer:   RESULT_PAUSE_MS,
        bankedShot:   banked,
        audioTrigger: banked ? 'bank' : 'swish',
      };
    }

    // Miss
    if (y + BALL_R >= FLOOR_Y || x > CANVAS_W + 60) {
      return {
        ...state,
        ball:         { x: clamp(x, -60, CANVAS_W + 60), y: Math.min(y, FLOOR_Y), vx, vy },
        streak:       0,
        phase:        'result_miss',
        phaseTimer:   RESULT_PAUSE_MS,
        bankedShot:   banked,
        audioTrigger: Math.abs(x - HOOP_CX) < 90 ? 'miss_rim' : 'miss_air',
      };
    }

    return { ...state, ball: { x, y, vx, vy }, bankedShot: banked, audioTrigger: audio };
  }

  return state;
}
