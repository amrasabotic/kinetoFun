// ── Canvas / court constants ───────────────────────────────────────────────────

export const CANVAS_W  = 800;
export const CANVAS_H  = 450;
export const GROUND_Y  = 400;            // floor line
export const NET_X     = CANVAS_W / 2;  // 400
export const NET_TOP_Y = GROUND_Y - 130; // 270  (net is 130 px tall)
export const NET_W     = 10;

export const BALL_R    = 16;
export const GRAVITY   = 0.40;           // px/frame velocity increase

// Avatar
export const AVATAR_H          = 90;
export const HEAD_R             = 14;
export const HIT_RADIUS         = 75;    // distance from avatar hit-centre → triggers hit
export const HIT_CENTRE_Y_OFF   = 25;   // GROUND_Y - AVATAR_H + this = hit-zone centre Y

// Player / AI movement zones (x range)
export const PLAYER_MIN_X = 80;
export const PLAYER_MAX_X = NET_X - 80; // 320
export const AI_MIN_X     = NET_X + 80; // 480
export const AI_MAX_X     = CANVAS_W - 80; // 720

// Game rules
export const WINNING_SCORE  = 7;
export const POINT_PAUSE_MS = 1800;
export const SERVE_DELAY_MS = 1500;

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GamePhase =
  | 'serving_player'
  | 'serving_ai'
  | 'playing'
  | 'point_player'
  | 'point_ai'
  | 'game_over';

export type AudioTrigger =
  | 'player_hit'
  | 'player_smash'
  | 'player_block'
  | 'ai_hit'
  | 'ai_smash'
  | 'serve'
  | 'point_player'
  | 'point_ai'
  | 'gameover'
  | null;

export interface VolleyGestureInput {
  playerX:      number;   // 0–1: normalised position inside player zone
  isSmashing:   boolean;  // edge-triggered raise
  isBlocking:   boolean;  // both hands spread wide
  highestHandY: number;   // 0–1, lower value = higher hand (for visuals)
  handsSpread:  number;   // 0–1 spread fraction (for block visual)
  handDetected: boolean;
}

export interface Ball  { x: number; y: number; vx: number; vy: number }
export interface Player { x: number; score: number; hitCooldown: number; isBlocking: boolean }
export interface AIPlayer { x: number; score: number; hitCooldown: number; isSmashing: boolean }

export interface GameState {
  ball:         Ball;
  player:       Player;
  ai:           AIPlayer;
  phase:        GamePhase;
  serveTimer:   number;       // ms remaining before auto-serve launches
  pointTimer:   number;       // ms remaining in point-pause
  difficulty:   Difficulty;
  winner:       'player' | 'ai' | null;
  audioTrigger: AudioTrigger;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function hitCentreY(): number {
  return GROUND_Y - AVATAR_H + HIT_CENTRE_Y_OFF;
}

function serveStartPos(side: 'player' | 'ai'): Ball {
  const x = side === 'player'
    ? (PLAYER_MIN_X + PLAYER_MAX_X) / 2
    : (AI_MIN_X + AI_MAX_X) / 2;
  return { x, y: GROUND_Y - 60, vx: 0, vy: 0 };
}

function hitVelocity(targetSide: 'right' | 'left', isSmash: boolean): Pick<Ball, 'vx' | 'vy'> {
  if (targetSide === 'right') return { vx: isSmash ? 17 : 10, vy: isSmash ? -9 : -13 };
  return { vx: isSmash ? -17 : -10, vy: isSmash ? -9 : -13 };
}

// ── Initial state ─────────────────────────────────────────────────────────────

export function initialGameState(difficulty: Difficulty): GameState {
  return {
    ball:         serveStartPos('player'),
    player:       { x: (PLAYER_MIN_X + PLAYER_MAX_X) / 2, score: 0, hitCooldown: 0, isBlocking: false },
    ai:           { x: (AI_MIN_X + AI_MAX_X) / 2, score: 0, hitCooldown: 0, isSmashing: false },
    phase:        'serving_player',
    serveTimer:   SERVE_DELAY_MS,
    pointTimer:   0,
    difficulty,
    winner:       null,
    audioTrigger: null,
  };
}

// ── Ball physics ──────────────────────────────────────────────────────────────

function stepBall(ball: Ball, dt: number): Ball {
  let { x, y, vx, vy } = ball;

  vy = Math.min(vy + GRAVITY * dt, 22);
  x += vx * dt;
  y += vy * dt;

  // Ceiling
  if (y - BALL_R < 8) { y = BALL_R + 8; vy = Math.abs(vy) * 0.5; }

  // Side walls (keep ball in play, bounce back)
  if (x - BALL_R < 0) { x = BALL_R + 1; vx =  Math.abs(vx) * 0.75; }
  if (x + BALL_R > CANVAS_W) { x = CANVAS_W - BALL_R - 1; vx = -Math.abs(vx) * 0.75; }

  // Net collision
  const nL = NET_X - NET_W / 2 - BALL_R;
  const nR = NET_X + NET_W / 2 + BALL_R;
  if (x > nL && x < nR && y + BALL_R > NET_TOP_Y) {
    if (vx > 0) { x = nL; vx = -Math.abs(vx) * 0.60; }
    else         { x = nR; vx =  Math.abs(vx) * 0.60; }
    vy += 3;
  }

  return { x, y, vx, vy };
}

// ── AI movement & decisions ───────────────────────────────────────────────────

function stepAI(ai: AIPlayer, ball: Ball, dt: number, difficulty: Difficulty): AIPlayer {
  const speed  = difficulty === 'easy' ? 3.5 : difficulty === 'normal' ? 5.5 : 8.5;
  const target = clamp(ball.x, AI_MIN_X, AI_MAX_X);
  const dx     = target - ai.x;
  return {
    ...ai,
    x:           clamp(ai.x + Math.sign(dx) * Math.min(Math.abs(dx), speed * dt), AI_MIN_X, AI_MAX_X),
    hitCooldown: Math.max(0, ai.hitCooldown - dt),
    isSmashing:  false,
  };
}

function aiWillSmash(difficulty: Difficulty): boolean {
  const p = difficulty === 'easy' ? 0.14 : difficulty === 'normal' ? 0.33 : 0.58;
  return Math.random() < p;
}

function aiWillMiss(difficulty: Difficulty): boolean {
  const p = difficulty === 'easy' ? 0.14 : difficulty === 'normal' ? 0.05 : 0.0;
  return Math.random() < p;
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function stepGame(
  state:   GameState,
  dt:      number,              // normalised delta (1.0 = one 60-fps frame)
  gesture: VolleyGestureInput,
): GameState {
  if (state.phase === 'game_over') return state;

  const dtMs = dt * 16.67;

  // ── Serve phase ──────────────────────────────────────────────────────────
  if (state.phase === 'serving_player' || state.phase === 'serving_ai') {
    const remaining = state.serveTimer - dtMs;

    // Player can early-trigger a smash-serve
    if (state.phase === 'serving_player' && gesture.isSmashing) {
      const start = serveStartPos('player');
      const vel   = hitVelocity('right', true);
      return {
        ...state,
        ball:         { ...start, ...vel },
        phase:        'playing',
        serveTimer:   0,
        player:       { ...state.player, hitCooldown: 20 },
        ai:           { ...state.ai,     hitCooldown: 0  },
        audioTrigger: 'player_smash',
      };
    }

    if (remaining <= 0) {
      const side  = state.phase === 'serving_player' ? 'player' : 'ai';
      const start = serveStartPos(side);
      const vel   = hitVelocity(side === 'player' ? 'right' : 'left', false);
      return {
        ...state,
        ball:         { ...start, ...vel },
        phase:        'playing',
        serveTimer:   0,
        player:       { ...state.player, hitCooldown: 15 },
        ai:           { ...state.ai,     hitCooldown: 15 },
        audioTrigger: 'serve',
      };
    }
    return { ...state, serveTimer: remaining, audioTrigger: null };
  }

  // ── Point pause ──────────────────────────────────────────────────────────
  if (state.phase === 'point_player' || state.phase === 'point_ai') {
    const remaining = state.pointTimer - dtMs;
    if (remaining <= 0) {
      const serveSide = state.phase === 'point_player' ? 'player' : 'ai';
      const start     = serveStartPos(serveSide);
      return {
        ...state,
        ball:        start,
        phase:       serveSide === 'player' ? 'serving_player' : 'serving_ai',
        serveTimer:  SERVE_DELAY_MS,
        pointTimer:  0,
        audioTrigger: null,
      };
    }
    return { ...state, pointTimer: remaining, audioTrigger: null };
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  let { ball } = state;
  let player   = { ...state.player, hitCooldown: Math.max(0, state.player.hitCooldown - dt) };
  let ai       = stepAI(state.ai, ball, dt, state.difficulty);
  let audioTrigger: AudioTrigger = null;

  // Move player from gesture
  if (gesture.handDetected) {
    const targetX   = clamp(gesture.playerX * (PLAYER_MAX_X - PLAYER_MIN_X) + PLAYER_MIN_X, PLAYER_MIN_X, PLAYER_MAX_X);
    const moveSpeed = 14;
    const dx        = targetX - player.x;
    player = {
      ...player,
      x:          clamp(player.x + Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed * dt), PLAYER_MIN_X, PLAYER_MAX_X),
      isBlocking: gesture.isBlocking,
    };
  }

  // Ball physics
  ball = stepBall(ball, dt);

  // ── Player hit detection ──────────────────────────────────────────────────
  if (ball.x < NET_X && player.hitCooldown <= 0) {
    const dist = Math.hypot(ball.x - player.x, ball.y - hitCentreY());
    if (dist < HIT_RADIUS) {
      if (player.isBlocking) {
        ball         = { ...ball, vx: -ball.vx * 0.70, vy: Math.min(ball.vy, -5) };
        player       = { ...player, hitCooldown: 35 };
        audioTrigger = 'player_block';
      } else {
        const isSmash = gesture.isSmashing;
        ball          = { ...ball, ...hitVelocity('right', isSmash) };
        player        = { ...player, hitCooldown: 25 };
        audioTrigger  = isSmash ? 'player_smash' : 'player_hit';
      }
    }
  }

  // ── AI hit detection ──────────────────────────────────────────────────────
  if (ball.x > NET_X && ai.hitCooldown <= 0) {
    const dist = Math.hypot(ball.x - ai.x, ball.y - hitCentreY());
    if (dist < HIT_RADIUS) {
      if (!aiWillMiss(state.difficulty)) {
        const isSmash = aiWillSmash(state.difficulty);
        ball          = { ...ball, ...hitVelocity('left', isSmash) };
        ai            = { ...ai, hitCooldown: 25, isSmashing: isSmash };
        audioTrigger  = isSmash ? 'ai_smash' : 'ai_hit';
      } else {
        ai = { ...ai, hitCooldown: 30 };
      }
    }
  }

  // ── Ball hits floor (point scored) ───────────────────────────────────────
  if (ball.y + BALL_R >= GROUND_Y) {
    const scoringFor = ball.x < NET_X ? 'ai' : 'player';
    const pScore     = player.score + (scoringFor === 'player' ? 1 : 0);
    const aScore     = ai.score     + (scoringFor === 'ai'     ? 1 : 0);
    const isGameOver = pScore >= WINNING_SCORE || aScore >= WINNING_SCORE;

    const nextPhase: GamePhase = isGameOver
      ? 'game_over'
      : scoringFor === 'player' ? 'point_player' : 'point_ai';

    return {
      ...state,
      ball:         { ...ball, y: GROUND_Y - BALL_R, vy: 0, vx: 0 },
      player:       { ...player, score: pScore },
      ai:           { ...ai,     score: aScore  },
      phase:        nextPhase,
      pointTimer:   POINT_PAUSE_MS,
      winner:       isGameOver ? (pScore >= WINNING_SCORE ? 'player' : 'ai') : null,
      audioTrigger: isGameOver
        ? 'gameover'
        : scoringFor === 'player' ? 'point_player' : 'point_ai',
    };
  }

  return { ...state, ball, player, ai, audioTrigger };
}
