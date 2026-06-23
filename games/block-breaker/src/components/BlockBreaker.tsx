import { useCallback, useEffect, useRef, useState } from "react";
import { HandTracker } from "./HandTracker";

type Screen = "menu" | "playing" | "paused" | "gameover";
type Difficulty = "easy" | "medium" | "hard";

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

const GAME_W = 800;
const GAME_H = 600;
const PADDLE_W = 110;
const PADDLE_H = 16;
const BALL_R = 8;
const ROWS = 5;
const COLS = 10;
const BLOCK_GAP = 6;
const BLOCK_W = (GAME_W - BLOCK_GAP * (COLS + 1)) / COLS;
const BLOCK_H = 22;
const ROW_COLORS = ["#ff3b6b", "#ff8b3b", "#ffd83b", "#3bff8b", "#3bd8ff"];

const DIFFICULTY_SPEED: Record<Difficulty, number> = {
  easy: 3,
  medium: 4.5,
  hard: 6.5,
};
const DIFFICULTY_MAX: Record<Difficulty, number> = {
  easy: 7,
  medium: 9,
  hard: 12,
};

function makeBlocks(): Block[] {
  const blocks: Block[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      blocks.push({
        x: BLOCK_GAP + c * (BLOCK_W + BLOCK_GAP),
        y: 60 + r * (BLOCK_H + BLOCK_GAP),
        w: BLOCK_W,
        h: BLOCK_H,
        color: ROW_COLORS[r],
        alive: true,
      });
    }
  }
  return blocks;
}

export function BlockBreaker() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handXRef = useRef<number | null>(null);
  const difficultyRef = useRef<Difficulty>("medium");
  const stateRef = useRef({
    paddleX: GAME_W / 2 - PADDLE_W / 2,
    ball: { x: GAME_W / 2, y: GAME_H - 60, vx: 4, vy: -4, stuck: true },
    blocks: makeBlocks(),
    score: 0,
    lives: 3,
  });

  useEffect(() => {
    const stored = localStorage.getItem("bb_high");
    if (stored) setHighScore(parseInt(stored, 10) || 0);
  }, []);

  const onHandX = useCallback((x: number | null) => {
    handXRef.current = x;
  }, []);

  const resetGame = useCallback((diff: Difficulty) => {
    const spd = DIFFICULTY_SPEED[diff];
    stateRef.current = {
      paddleX: GAME_W / 2 - PADDLE_W / 2,
      ball: { x: GAME_W / 2, y: GAME_H - 60, vx: spd, vy: -spd, stuck: true },
      blocks: makeBlocks(),
      score: 0,
      lives: 3,
    };
    setScore(0);
    setLives(3);
  }, []);

  const startGame = useCallback((diff?: Difficulty) => {
    const d = diff ?? difficulty;
    setDifficulty(d);
    difficultyRef.current = d;
    resetGame(d);
    setScreen("playing");
  }, [resetGame, difficulty]);

  // Game loop
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;

    const launchTimer = setTimeout(() => {
      if (stateRef.current.ball.stuck) {
        stateRef.current.ball.stuck = false;
      }
    }, 1200);

    const loop = () => {
      if (!running) return;
      const s = stateRef.current;
      const diff = difficultyRef.current;
      const maxSpeed = DIFFICULTY_MAX[diff];
      const baseSpeed = DIFFICULTY_SPEED[diff];
      const hx = handXRef.current;
      const targetX =
        hx != null ? hx * GAME_W - PADDLE_W / 2 : s.paddleX;
      s.paddleX += (targetX - s.paddleX) * 0.3;
      s.paddleX = Math.max(0, Math.min(GAME_W - PADDLE_W, s.paddleX));

      const b = s.ball;
      if (b.stuck) {
        b.x = s.paddleX + PADDLE_W / 2;
        b.y = GAME_H - 60;
      } else {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < BALL_R) { b.x = BALL_R; b.vx *= -1; }
        else if (b.x > GAME_W - BALL_R) { b.x = GAME_W - BALL_R; b.vx *= -1; }
        if (b.y < BALL_R) { b.y = BALL_R; b.vy *= -1; }
        const paddleY = GAME_H - 40;
        if (
          b.y + BALL_R >= paddleY &&
          b.y + BALL_R <= paddleY + PADDLE_H + 6 &&
          b.x >= s.paddleX &&
          b.x <= s.paddleX + PADDLE_W &&
          b.vy > 0
        ) {
          b.y = paddleY - BALL_R;
          const hit = (b.x - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
          const angle = hit * (Math.PI / 3);
          const speed = Math.min(maxSpeed, Math.hypot(b.vx, b.vy) * 1.02);
          b.vx = Math.sin(angle) * speed;
          b.vy = -Math.abs(Math.cos(angle) * speed);
        }
        for (const blk of s.blocks) {
          if (!blk.alive) continue;
          if (
            b.x + BALL_R > blk.x &&
            b.x - BALL_R < blk.x + blk.w &&
            b.y + BALL_R > blk.y &&
            b.y - BALL_R < blk.y + blk.h
          ) {
            blk.alive = false;
            s.score += 10;
            setScore(s.score);
            const overlapX = Math.min(
              b.x + BALL_R - blk.x,
              blk.x + blk.w - (b.x - BALL_R),
            );
            const overlapY = Math.min(
              b.y + BALL_R - blk.y,
              blk.y + blk.h - (b.y - BALL_R),
            );
            if (overlapX < overlapY) b.vx *= -1;
            else b.vy *= -1;
            break;
          }
        }
        if (s.blocks.every((blk) => !blk.alive)) {
          s.score += 500;
          setScore(s.score);
          s.blocks = makeBlocks();
          b.stuck = true;
          b.vx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
          b.vy = -baseSpeed;
          setTimeout(() => {
            if (stateRef.current.ball.stuck) stateRef.current.ball.stuck = false;
          }, 1000);
        }
        if (b.y > GAME_H + BALL_R) {
          s.lives -= 1;
          setLives(s.lives);
          if (s.lives <= 0) {
            running = false;
            const hi = Math.max(highScore, s.score);
            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem("bb_high", String(hi));
            }
            window.parent.postMessage({ type: 'GAME_COMPLETE', score: s.score }, '*');
            setScreen("gameover");
            return;
          }
          b.stuck = true;
          b.vx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
          b.vy = -baseSpeed;
          setTimeout(() => {
            if (stateRef.current.ball.stuck) stateRef.current.ball.stuck = false;
          }, 1000);
        }
      }

      ctx.fillStyle = "#0a0418";
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.strokeStyle = "rgba(120,80,200,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < GAME_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_H); ctx.stroke();
      }
      for (let j = 0; j < GAME_H; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(GAME_W, j); ctx.stroke();
      }
      for (const blk of s.blocks) {
        if (!blk.alive) continue;
        ctx.fillStyle = blk.color;
        ctx.shadowColor = blk.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(blk.x, blk.y, blk.w, blk.h);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.strokeRect(blk.x + 0.5, blk.y + 0.5, blk.w - 1, blk.h - 1);
      }
      ctx.fillStyle = "#3bffd8";
      ctx.shadowColor = "#3bffd8";
      ctx.shadowBlur = 15;
      ctx.fillRect(s.paddleX, GAME_H - 40, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#ff3bd8";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (b.stuck) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("GET READY...", GAME_W / 2, GAME_H / 2);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(launchTimer);
    };
  }, [screen, highScore]);

  const difficultyLabel = difficulty.toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 scanlines">
      <div className="relative w-full" style={{ maxWidth: GAME_W }}>
        {/* HUD */}
        <div className="flex items-center justify-between mb-3 text-xs gap-2 flex-wrap">
          <div className="text-primary text-glow">
            SCORE <span className="text-foreground">{String(score).padStart(6, "0")}</span>
          </div>
          <div className="text-accent text-glow">
            HI <span className="text-foreground">{String(highScore).padStart(6, "0")}</span>
          </div>
          <div className="flex items-center gap-2 leading-none">
            <span className="text-[var(--neon-yellow)] text-glow">LIVES</span>
            <span className="text-foreground text-xs tracking-tight">
              {"●".repeat(lives)}{"○".repeat(Math.max(0, 3 - lives))}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            DIFF <span className="text-[var(--neon-yellow)]">{difficultyLabel}</span>
          </div>
          {screen === "playing" || screen === "paused" ? (
            <button
              onClick={() => setScreen(screen === "playing" ? "paused" : "playing")}
              className="text-[10px] px-3 py-2 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition"
            >
              {screen === "playing" ? "PAUSE" : "RESUME"}
            </button>
          ) : null}
        </div>

        {/* Stage */}
        <div
          className="relative border-4 border-primary rounded-sm overflow-hidden shadow-[0_0_40px_var(--primary)]"
          style={{ aspectRatio: `${GAME_W} / ${GAME_H}` }}
        >
          <canvas
            ref={canvasRef}
            width={GAME_W}
            height={GAME_H}
            className="block w-full h-full"
          />

          {screen === "menu" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/95 text-center px-4">
              <h1 className="text-3xl md:text-5xl text-primary text-glow leading-tight">
                BLOCK<br />BREAKER
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground max-w-md leading-relaxed">
                Control the paddle with your HAND.<br />
                Use your webcam — keep your hand on the guideline.<br />
                Break every block. Don't drop the ball.
              </p>
              <div className="text-[10px] text-accent">HI SCORE: {String(highScore).padStart(6, "0")}</div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-[10px] text-[var(--neon-yellow)] text-glow">SELECT DIFFICULTY</div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`text-[10px] px-3 py-2 border-2 transition ${
                        difficulty === d
                          ? "border-[var(--neon-yellow)] text-[var(--neon-yellow)] bg-[var(--neon-yellow)]/10"
                          : "border-muted text-muted-foreground hover:border-accent hover:text-accent"
                      }`}
                    >
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => startGame()} className="btn-arcade">
                ▶ START GAME
              </button>
              <div className="text-[8px] text-muted-foreground blink">INSERT COIN</div>
            </div>
          )}

          {screen === "paused" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/90 text-center">
              <h2 className="text-2xl text-accent text-glow">PAUSED</h2>
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={() => setScreen("playing")} className="btn-arcade">
                  RESUME
                </button>
                <button
                  onClick={() => {
                    if (score > highScore) {
                      setHighScore(score);
                      localStorage.setItem("bb_high", String(score));
                    }
                    setScreen("menu");
                  }}
                  className="btn-arcade-accent"
                >
                  EXIT
                </button>
              </div>
            </div>
          )}

          {screen === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/95 text-center px-4">
              <h2 className="text-3xl md:text-4xl text-destructive text-glow">GAME OVER</h2>
              <div className="space-y-2">
                <div className="text-xs text-primary">FINAL SCORE</div>
                <div className="text-2xl text-foreground text-glow">
                  {String(score).padStart(6, "0")}
                </div>
                <div className="text-xs text-accent mt-4">HIGH SCORE</div>
                <div className="text-xl text-[var(--neon-yellow)] text-glow">
                  {String(highScore).padStart(6, "0")}
                </div>
                {score >= highScore && score > 0 && (
                  <div className="text-[10px] text-accent blink mt-2">★ NEW RECORD ★</div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={() => startGame()} className="btn-arcade">
                  PLAY AGAIN
                </button>
                <button onClick={() => setScreen("menu")} className="btn-arcade-accent">
                  MAIN MENU
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Webcam BELOW the game, never overlapping the play area */}
        {(screen === "playing" || screen === "paused") && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <HandTracker onX={onHandX} active={screen === "playing"} />
            <div className="text-[8px] text-primary text-center">
              MOVE HAND ALONG GUIDELINE
            </div>
          </div>
        )}

        <div className="mt-3 text-center text-[8px] text-muted-foreground">
          © RETRO ARCADE • POWERED BY MEDIAPIPE HAND TRACKING
        </div>
      </div>
    </div>
  );
}
