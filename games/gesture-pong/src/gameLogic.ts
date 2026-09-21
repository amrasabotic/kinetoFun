export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible' | 'endless';

export interface GameState {
  ball: { x: number; y: number; vx: number; vy: number };
  playerPaddle: { x: number };
  botPaddle: { x: number };
  playerScore: number;
  botScore: number;
  playerGames: number;
  botGames: number;
  // Endless mode
  endlessLevel: number;    // increases every point scored
  endlessBallMult: number; // speed multiplier
  // Phase
  phase: 'countdown' | 'playing' | 'scored' | 'gameOver';
  countdown: number;       // 3 → 2 → 1 → 0 (go!)
  countdownTimer: number;  // ms until next tick
  scorer: 'player' | 'bot' | null;
  scoreTimer: number;
  winner: 'player' | 'bot' | null;
  difficulty: Difficulty;
}

export const TABLE = {
  width: 480,
  height: 720,
  paddleWidth: 100,
  paddleHeight: 14,
  paddleY: 670,
  botPaddleY: 50,
  ballRadius: 10,
  netY: 360,
};

const BALL_SPEED_INIT = 5.5;
const BALL_MAX_SPEED = 18;

// Single game: first to 11, win by 2
const POINTS_TO_WIN = 11;
const WIN_BY = 2;

const BOT_BASE: Record<Difficulty, { speed: number; reactionOffset: number }> = {
  easy:       { speed: 2.2, reactionOffset: 65 },
  medium:     { speed: 3.8, reactionOffset: 32 },
  hard:       { speed: 5.5, reactionOffset: 10 },
  impossible: { speed: 9,   reactionOffset: 0 },
  endless:    { speed: 2.5, reactionOffset: 55 },
};

function clampPaddleX(x: number): number {
  return Math.max(TABLE.paddleWidth / 2, Math.min(TABLE.width - TABLE.paddleWidth / 2, x));
}

function makeBall(goingUp: boolean): GameState['ball'] {
  const angle = (Math.random() * 44 - 22) * (Math.PI / 180);
  const dir = goingUp ? -1 : 1;
  return {
    x: TABLE.width / 2,
    y: TABLE.height / 2,
    vx: Math.sin(angle) * BALL_SPEED_INIT,
    vy: dir * BALL_SPEED_INIT,
  };
}

function checkGameWin(ps: number, bs: number): 'player' | 'bot' | null {
  if (ps >= POINTS_TO_WIN && ps - bs >= WIN_BY) return 'player';
  if (bs >= POINTS_TO_WIN && bs - ps >= WIN_BY) return 'bot';
  return null;
}

export function initialGameState(difficulty: Difficulty): GameState {
  return {
    ball: makeBall(false),
    playerPaddle: { x: TABLE.width / 2 },
    botPaddle: { x: TABLE.width / 2 },
    playerScore: 0,
    botScore: 0,
    playerGames: 0,
    botGames: 0,
    endlessLevel: 0,
    endlessBallMult: 1,
    phase: 'countdown',
    countdown: 3,
    countdownTimer: 1000,
    scorer: null,
    scoreTimer: 0,
    winner: null,
    difficulty,
  };
}

export function stepGame(state: GameState, playerPaddleX: number, _deltaMs: number): GameState {
  if (state.phase === 'gameOver') return state;

  // ── Countdown ──
  if (state.phase === 'countdown') {
    const timer = state.countdownTimer - 16;
    if (timer <= 0) {
      const next = state.countdown - 1;
      if (next < 0) {
        return { ...state, phase: 'playing', countdown: 0, countdownTimer: 0 };
      }
      return { ...state, countdown: next, countdownTimer: next === 0 ? 700 : 1000 };
    }
    return { ...state, countdownTimer: timer };
  }

  // ── Post-score pause ──
  if (state.phase === 'scored') {
    const timer = state.scoreTimer - 16;
    if (timer <= 0) {
      const goingUp = state.scorer === 'player';
      return {
        ...state,
        ball: makeBall(goingUp),
        phase: 'playing',
        scorer: null,
        scoreTimer: 0,
      };
    }
    return { ...state, scoreTimer: timer };
  }

  // ── Playing ──
  const isEndless = state.difficulty === 'endless';
  const base = BOT_BASE[state.difficulty];

  // Endless: scale bot difficulty with level
  const endlessScale = isEndless ? 1 + state.endlessLevel * 0.04 : 1;
  const botSpeed = Math.min(base.speed * endlessScale, 11);
  const reactionOffset = Math.max(base.reactionOffset - state.endlessLevel * 1.5, 0);
  const ballMult = isEndless ? state.endlessBallMult : 1;

  const newPlayerX = clampPaddleX(playerPaddleX);

  // Bot AI
  let botX = state.botPaddle.x;
  const targetX = state.ball.x + (Math.random() - 0.5) * reactionOffset;
  const diff = targetX - botX;
  botX = clampPaddleX(botX + Math.sign(diff) * Math.min(Math.abs(diff), botSpeed));

  let { x, y, vx, vy } = state.ball;
  x += vx * ballMult;
  y += vy * ballMult;

  // Wall bounces
  if (x - TABLE.ballRadius < 0)            { x = TABLE.ballRadius; vx = Math.abs(vx); }
  if (x + TABLE.ballRadius > TABLE.width)  { x = TABLE.width - TABLE.ballRadius; vx = -Math.abs(vx); }

  // Player paddle (bottom)
  const paddleTop = TABLE.paddleY - TABLE.paddleHeight / 2;
  if (vy > 0 && y + TABLE.ballRadius >= paddleTop && y - TABLE.ballRadius < paddleTop + TABLE.paddleHeight) {
    const left = newPlayerX - TABLE.paddleWidth / 2;
    const right = newPlayerX + TABLE.paddleWidth / 2;
    if (x >= left && x <= right) {
      y = paddleTop - TABLE.ballRadius;
      const offset = (x - newPlayerX) / (TABLE.paddleWidth / 2);
      const speed = Math.min(Math.sqrt(vx * vx + vy * vy) + 0.35, BALL_MAX_SPEED);
      const angle = offset * 55 * (Math.PI / 180);
      vx = Math.sin(angle) * speed;
      vy = -Math.cos(angle) * speed;
    }
  }

  // Bot paddle (top)
  const botBottom = TABLE.botPaddleY + TABLE.paddleHeight / 2;
  if (vy < 0 && y - TABLE.ballRadius <= botBottom && y + TABLE.ballRadius > botBottom - TABLE.paddleHeight) {
    const left = botX - TABLE.paddleWidth / 2;
    const right = botX + TABLE.paddleWidth / 2;
    if (x >= left && x <= right) {
      y = botBottom + TABLE.ballRadius;
      const offset = (x - botX) / (TABLE.paddleWidth / 2);
      const speed = Math.min(Math.sqrt(vx * vx + vy * vy) + 0.35, BALL_MAX_SPEED);
      const angle = offset * 55 * (Math.PI / 180);
      vx = Math.sin(angle) * speed;
      vy = Math.cos(angle) * speed;
    }
  }

  // Score
  if (y > TABLE.height + TABLE.ballRadius * 2 || y < -TABLE.ballRadius * 2) {
    const botScored = y > TABLE.height + TABLE.ballRadius * 2;
    const newPS = state.playerScore + (botScored ? 0 : 1);
    const newBS = state.botScore + (botScored ? 1 : 0);

    // Endless mode: no win condition, just track score and ramp difficulty
    if (isEndless) {
      const newLevel = state.endlessLevel + 1;
      const newMult = Math.min(1 + newLevel * 0.03, 2.8);
      return {
        ...state,
        ball: { x, y, vx, vy },
        playerPaddle: { x: newPlayerX },
        botPaddle: { x: botX },
        playerScore: newPS,
        botScore: newBS,
        endlessLevel: newLevel,
        endlessBallMult: newMult,
        phase: 'scored',
        scorer: botScored ? 'bot' : 'player',
        scoreTimer: 800,
      };
    }

    const gameWinner = checkGameWin(newPS, newBS);
    if (gameWinner) {
      const newPG = state.playerGames + (gameWinner === 'player' ? 1 : 0);
      const newBG = state.botGames + (gameWinner === 'bot' ? 1 : 0);
      return {
        ...state,
        ball: { x, y, vx, vy },
        playerPaddle: { x: newPlayerX },
        botPaddle: { x: botX },
        playerScore: newPS,
        botScore: newBS,
        playerGames: newPG,
        botGames: newBG,
        phase: 'gameOver',
        scorer: gameWinner,
        winner: gameWinner,
        scoreTimer: 0,
      };
    }

    return {
      ...state,
      ball: { x, y, vx, vy },
      playerPaddle: { x: newPlayerX },
      botPaddle: { x: botX },
      playerScore: newPS,
      botScore: newBS,
      phase: 'scored',
      scorer: botScored ? 'bot' : 'player',
      scoreTimer: 800,
    };
  }

  return {
    ...state,
    ball: { x, y, vx, vy },
    playerPaddle: { x: newPlayerX },
    botPaddle: { x: botX },
  };
}
