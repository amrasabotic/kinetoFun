/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";

type Screen = "menu" | "howto" | "difficulty" | "game";
type Difficulty = "easy" | "medium" | "hard" | "endless";

// Logical table dimensions (game world)
const TABLE_W = 600;
const TABLE_H = 900;
const GOAL_W = 220;
const PUCK_R = 22;
const MALLET_R = 40;
const WALL = 14;

interface DiffCfg {
  puckSpeed: number; // canonical puck speed — constant after mallet hits
  botSpeed: number;
  botReact: number;
  label: string;
  blurb: string;
  emoji: string;
  tint: string;
}

const DIFFS: Record<Difficulty, DiffCfg> = {
  easy:    { puckSpeed: 6.5, botSpeed: 3.2, botReact: 0.55, label: "Easy",    blurb: "Slow puck, sleepy bot",   emoji: "🐣", tint: "from-emerald-400/40 to-emerald-700/10" },
  medium:  { puckSpeed: 8.5, botSpeed: 4.8, botReact: 0.78, label: "Medium",  blurb: "Picks up the pace",       emoji: "⚡", tint: "from-sky-400/40 to-sky-700/10" },
  hard:    { puckSpeed: 10.5,botSpeed: 6.4, botReact: 0.94, label: "Hard",    blurb: "Sharp bot, fast puck",    emoji: "🔥", tint: "from-rose-400/40 to-rose-700/10" },
  endless: { puckSpeed: 8.5, botSpeed: 4.6, botReact: 0.82, label: "Endless", blurb: "No score limit",          emoji: "♾️", tint: "from-fuchsia-400/40 to-fuchsia-700/10" },
};

export default function GestureAirHockey() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_#1a2a6c_0%,_#0b1230_55%,_#04061a_100%)] text-white relative">
      <AnimatedBackdrop />
      {screen === "menu" && (
        <Menu onPlay={() => setScreen("difficulty")} onHow={() => setScreen("howto")} />
      )}
      {screen === "howto" && <HowTo onBack={() => setScreen("menu")} />}
      {screen === "difficulty" && (
        <DifficultyPick
          onBack={() => setScreen("menu")}
          onPick={(d) => { setDifficulty(d); setScreen("game"); }}
        />
      )}
      {screen === "game" && (
        <Game difficulty={difficulty} onExit={() => setScreen("menu")} />
      )}
    </div>
  );
}

/* ------------------------- Animated backdrop ------------------------- */
function AnimatedBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse" />
      <div className="absolute -bottom-32 -right-24 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/20 blur-[140px] animate-pulse [animation-delay:1.2s]" />
      <div className="absolute top-1/3 left-1/2 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[120px] animate-pulse [animation-delay:.6s]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

/* ----------------------------- MENU ----------------------------- */
function Menu({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Powered by hand tracking
      </div>
      <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95]">
        <span className="block bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(120,200,255,0.45)]">
          Gesture
        </span>
        <span className="block bg-gradient-to-r from-amber-200 via-rose-300 to-fuchsia-300 bg-clip-text text-transparent">
          Air Hockey
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-base md:text-lg text-white/70">
        Wave your hand in front of the camera. Smack the puck. Crush the robot.
      </p>

      <div className="mt-12 flex flex-col gap-4 w-full max-w-xs">
        <BigButton onClick={onPlay} variant="primary">▶ Play</BigButton>
        <BigButton onClick={onHow} variant="ghost">? How To Play</BigButton>
      </div>

      <div className="mt-16 grid grid-cols-3 gap-6 text-xs text-white/50">
        <div className="flex flex-col items-center"><span className="text-2xl mb-1">🖐️</span>Hand tracking</div>
        <div className="flex flex-col items-center"><span className="text-2xl mb-1">🤖</span>Smart bot</div>
        <div className="flex flex-col items-center"><span className="text-2xl mb-1">⚡</span>4 modes</div>
      </div>
    </main>
  );
}

function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-6">How To Play</h2>
        <ul className="space-y-4 text-white/80 text-lg">
          <li>🖐️ Allow webcam access when asked.</li>
          <li>✋ Move your hand to move your mallet — keep it in frame.</li>
          <li>🏒 Stay inside the dashed box on the webcam — that's your half.</li>
          <li>🥅 Knock the puck into the robot's goal to score!</li>
          <li>🤖 First to 7 wins (Endless mode plays forever).</li>
        </ul>
        <div className="mt-8">
          <BigButton onClick={onBack} variant="primary">← Back</BigButton>
        </div>
      </div>
    </main>
  );
}

function DifficultyPick({
  onBack, onPick,
}: { onBack: () => void; onPick: (d: Difficulty) => void }) {
  const order: Difficulty[] = ["easy", "medium", "hard", "endless"];
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">Step 1 of 1</div>
      <h2 className="mb-2 text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
        Choose Your Challenge
      </h2>
      <p className="mb-10 text-white/60">Pick a difficulty to start the match</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
        {order.map((d) => {
          const o = DIFFS[d];
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${o.tint} p-6 text-left transition-all hover:scale-[1.03] hover:border-white/30 shadow-xl hover:shadow-2xl`}
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20" />
              <div className="relative">
                <div className="text-5xl mb-3">{o.emoji}</div>
                <div className="text-2xl font-black">{o.label}</div>
                <div className="text-sm text-white/70 mb-4">{o.blurb}</div>
                <div className="flex gap-1.5">
                  {[0,1,2,3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-8 rounded-full ${i < (d==="easy"?1:d==="medium"?2:d==="hard"?4:3) ? "bg-white/90" : "bg-white/20"}`}
                    />
                  ))}
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-white/90 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                  Start →
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-10">
        <BigButton onClick={onBack} variant="ghost">← Back</BigButton>
      </div>
    </main>
  );
}

function BigButton({
  children, onClick, variant,
}: { children: React.ReactNode; onClick: () => void; variant: "primary" | "ghost" }) {
  const base = "w-full rounded-2xl px-8 py-4 text-xl font-bold transition-all active:scale-95";
  const cls = variant === "primary"
    ? `${base} bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 text-white shadow-[0_8px_30px_rgba(120,80,255,0.55)] hover:brightness-110 hover:shadow-[0_12px_40px_rgba(120,80,255,0.7)]`
    : `${base} border border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur`;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

/* ----------------------------- GAME ----------------------------- */
function Game({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const cfg = DIFFS[difficulty];
  const winScore = difficulty === "endless" ? Infinity : 7;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handXRef = useRef<number | null>(null);
  const handYRef = useRef<number | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [winner, setWinner] = useState<null | "player" | "bot">(null);

  useEffect(() => {
    if (winner) window.parent.postMessage({ type: 'GAME_COMPLETE', score: playerScore }, '*');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const stateRef = useRef({
    puck: { x: TABLE_W / 2, y: TABLE_H / 2, vx: 0, vy: 0 },
    player: { x: TABLE_W / 2, y: TABLE_H - 120, px: TABLE_W / 2, py: TABLE_H - 120 },
    bot: { x: TABLE_W / 2, y: 120, vx: 0 },
    playing: false,
  });

  /* --- camera + MediaPipe --- */
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let landmarker: any = null;
    let rafId = 0;

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user", frameRate: { ideal: 60, max: 60 } },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
        const vision: any = await dynImport(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs",
        );
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        setCamReady(true);

        let lastTs = -1;
        // EMA smoothing of normalized coords
        let sx: number | null = null;
        let sy: number | null = null;
        const ALPHA = 0.55; // higher = more responsive, lower = smoother

        const loop = () => {
          if (stopped) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && landmarker) {
            const ts = performance.now();
            if (ts !== lastTs) {
              lastTs = ts;
              const res = landmarker.detectForVideo(v, ts);
              if (res?.landmarks?.length) {
                const lms = res.landmarks[0];
                // Use average of palm landmarks for stability: wrist(0), index_mcp(5), middle_mcp(9), ring_mcp(13), pinky_mcp(17)
                const ids = [0, 5, 9, 13, 17];
                let ax = 0, ay = 0;
                for (const i of ids) { ax += lms[i].x; ay += lms[i].y; }
                ax /= ids.length; ay /= ids.length;
                const mx = 1 - ax; // mirror
                const my = ay;
                sx = sx == null ? mx : sx + (mx - sx) * ALPHA;
                sy = sy == null ? my : sy + (my - sy) * ALPHA;
                handXRef.current = sx;
                handYRef.current = sy;
              }
            }
          }
          rafId = requestAnimationFrame(loop);
        };
        loop();
      } catch (e: any) {
        console.error(e);
        setCamError(e?.message || "Could not access webcam");
      }
    }
    init();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (landmarker?.close) landmarker.close();
    };
  }, []);

  /* --- countdown then play --- */
  useEffect(() => {
    if (!camReady) return;
    setCountdown(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(null);
        startRound(true);
      } else setCountdown(n);
    }, 800);
    return () => clearInterval(id);
  }, [camReady]);

  const startRound = useCallback((randomDir = false) => {
    const s = stateRef.current;
    s.puck.x = TABLE_W / 2;
    s.puck.y = TABLE_H / 2;
    const angle = (Math.random() * 0.6 - 0.3);
    const speed = cfg.puckSpeed * 0.7;
    s.puck.vx = Math.sin(angle) * speed;
    s.puck.vy = Math.cos(angle) * speed * (randomDir && Math.random() < 0.5 ? -1 : 1);
    s.playing = true;
  }, [cfg.puckSpeed]);

  /* --- main game loop --- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const render = () => {
      const s = stateRef.current;

      if (!pausedRef.current) {
        // Player mallet follows hand (mapped to player half)
        if (handXRef.current != null && handYRef.current != null) {
          const tx = handXRef.current * TABLE_W;
          // hand y 0..1 -> player half (TABLE_H/2 .. TABLE_H)
          const ty = TABLE_H / 2 + handYRef.current * (TABLE_H / 2);
          s.player.px = s.player.x;
          s.player.py = s.player.y;
          // Higher follow factor for responsiveness (smoothing is on input side)
          s.player.x += (tx - s.player.x) * 0.65;
          s.player.y += (ty - s.player.y) * 0.65;
          s.player.x = clamp(s.player.x, MALLET_R + WALL, TABLE_W - MALLET_R - WALL);
          s.player.y = clamp(s.player.y, TABLE_H / 2 + MALLET_R, TABLE_H - MALLET_R - WALL);
        }

        // Bot AI
        if (s.playing) {
          const targetX = s.puck.vy < 0
            ? s.puck.x + (Math.random() - 0.5) * 30 * (1 - cfg.botReact)
            : TABLE_W / 2 + (s.puck.x - TABLE_W / 2) * 0.3;
          const dx = targetX - s.bot.x;
          const move = clamp(dx, -cfg.botSpeed, cfg.botSpeed);
          s.bot.vx = move;
          s.bot.x += move;
          s.bot.x = clamp(s.bot.x, MALLET_R + WALL, TABLE_W - MALLET_R - WALL);
          const desiredY = s.puck.y < TABLE_H / 2 - 50 ? 160 + (cfg.botReact * 40) : 100;
          s.bot.y += (desiredY - s.bot.y) * 0.08;
        }

        // Puck physics
        if (s.playing) {
          s.puck.x += s.puck.vx;
          s.puck.y += s.puck.vy;
          // tiny friction
          s.puck.vx *= 0.999;
          s.puck.vy *= 0.999;

          // Walls
          if (s.puck.x < PUCK_R + WALL) { s.puck.x = PUCK_R + WALL; s.puck.vx = Math.abs(s.puck.vx); }
          if (s.puck.x > TABLE_W - PUCK_R - WALL) { s.puck.x = TABLE_W - PUCK_R - WALL; s.puck.vx = -Math.abs(s.puck.vx); }

          const goalLeft = (TABLE_W - GOAL_W) / 2;
          const goalRight = goalLeft + GOAL_W;
          if (s.puck.y < PUCK_R + WALL) {
            if (s.puck.x > goalLeft && s.puck.x < goalRight) {
              setPlayerScore((p) => { const np = p + 1; if (np >= winScore) setWinner("player"); return np; });
              s.playing = false;
              setTimeout(() => startRound(false), 600);
            } else { s.puck.y = PUCK_R + WALL; s.puck.vy = Math.abs(s.puck.vy); }
          }
          if (s.puck.y > TABLE_H - PUCK_R - WALL) {
            if (s.puck.x > goalLeft && s.puck.x < goalRight) {
              setBotScore((p) => { const np = p + 1; if (np >= winScore) setWinner("bot"); return np; });
              s.playing = false;
              setTimeout(() => startRound(false), 600);
            } else { s.puck.y = TABLE_H - PUCK_R - WALL; s.puck.vy = -Math.abs(s.puck.vy); }
          }

          // Mallet collisions — constant exit speed (swing strength doesn't matter)
          collideConstSpeed(s.puck, s.player, MALLET_R, PUCK_R, cfg.puckSpeed);
          collideConstSpeed(s.puck, s.bot, MALLET_R, PUCK_R, cfg.puckSpeed);
        }
      }

      // Draw
      drawTable(ctx);
      drawMallet(ctx, s.bot.x, s.bot.y, "#ff4f7e", "#7a0a25");
      drawMallet(ctx, s.player.x, s.player.y, "#5fd4ff", "#0a4a6b");
      drawPuck(ctx, s.puck.x, s.puck.y);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [cfg, startRound, winScore]);

  const reset = () => {
    setPlayerScore(0); setBotScore(0); setWinner(null); setCountdown(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(id); setCountdown(null); startRound(true); }
      else setCountdown(n);
    }, 800);
  };

  return (
    <div className="relative z-10 min-h-screen w-full">
      {/* Table area */}
      <div className="flex min-h-screen items-center justify-center px-4 py-2">
        <div className="relative flex items-stretch gap-4" style={{ height: "min(95vh, 900px)" }}>
          {/* LEFT: bot icon + score */}
          <div className="flex flex-col items-center justify-start gap-2 pt-6 w-20">
            <div className="text-[10px] uppercase tracking-[0.25em] text-rose-200/80">Robot</div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-700 shadow-[0_8px_30px_rgba(255,80,120,0.5)] text-3xl">
              🤖
            </div>
            <div className="mt-1 text-4xl font-black tabular-nums drop-shadow-lg">{botScore}</div>
          </div>

          {/* Table canvas */}
          <div className="relative" style={{ aspectRatio: `${TABLE_W} / ${TABLE_H}`, height: "100%" }}>
            <canvas
              ref={canvasRef}
              width={TABLE_W}
              height={TABLE_H}
              className="h-full w-full rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
            />
            {countdown !== null && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-[160px] font-black text-white drop-shadow-[0_0_40px_rgba(0,255,255,0.6)] animate-pulse">
                  {countdown}
                </div>
              </div>
            )}
            {paused && !winner && countdown === null && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[2rem] bg-black/60 backdrop-blur">
                <div className="text-6xl font-black tracking-widest">PAUSED</div>
              </div>
            )}
            {winner && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[2rem] bg-black/75 backdrop-blur">
                <div className="text-5xl font-black mb-4">
                  {winner === "player" ? "🏆 You Win!" : "🤖 Robot Wins"}
                </div>
                <div className="text-xl mb-6 text-white/70">{playerScore} – {botScore}</div>
                <div className="flex gap-3">
                  <button onClick={reset} className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-bold">Play Again</button>
                  <button onClick={onExit} className="rounded-xl border border-white/30 px-6 py-3">Menu</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: player score */}
          <div className="flex flex-col items-center justify-start gap-2 pt-6 w-20">
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/80">You</div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-700 shadow-[0_8px_30px_rgba(80,200,255,0.5)] text-3xl">
              🖐️
            </div>
            <div className="mt-1 text-4xl font-black tabular-nums drop-shadow-lg">{playerScore}</div>
          </div>
        </div>
      </div>

      {/* Bottom-right: pause/quit buttons above webcam */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            onClick={onExit}
            className="rounded-xl border border-rose-300/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-rose-500/30"
          >
            ⏻ Quit
          </button>
        </div>
        <div className="relative h-[180px] w-[240px] overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover [transform:scaleX(-1)]" />
          <div className="pointer-events-none absolute inset-x-2 bottom-2 top-1/2 rounded-md border-2 border-dashed border-cyan-300/80" />
          {!camReady && !camError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-white/70">
              Loading hand tracking…
            </div>
          )}
          {camError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-2 text-center text-xs text-rose-300">
              {camError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

// Constant-speed mallet collision: puck always leaves at `speed`
// in the direction from mallet center to puck center (plus light tangential
// influence from the mallet's motion direction only — not magnitude).
function collideConstSpeed(
  puck: { x: number; y: number; vx: number; vy: number },
  mallet: { x: number; y: number },
  mr: number, pr: number, speed: number,
) {
  const dx = puck.x - mallet.x;
  const dy = puck.y - mallet.y;
  const dist = Math.hypot(dx, dy);
  const min = mr + pr;
  if (dist < min && dist > 0.0001) {
    const nx = dx / dist;
    const ny = dy / dist;
    // push out of overlap
    const overlap = min - dist;
    puck.x += nx * overlap;
    puck.y += ny * overlap;
    // exit velocity is constant magnitude, direction = normal
    puck.vx = nx * speed;
    puck.vy = ny * speed;
  }
}

function drawTable(ctx: CanvasRenderingContext2D) {
  // Outer dark frame
  ctx.fillStyle = "#0a0d22";
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);

  // Ice surface gradient
  const r = 44;
  const grad = ctx.createLinearGradient(0, 0, 0, TABLE_H);
  grad.addColorStop(0, "#e8f4ff");
  grad.addColorStop(0.5, "#cfe6f8");
  grad.addColorStop(1, "#e8f4ff");
  roundRect(ctx, WALL, WALL, TABLE_W - WALL * 2, TABLE_H - WALL * 2, r);
  ctx.fillStyle = grad;
  ctx.fill();

  // Ice sheen overlay
  const sheen = ctx.createLinearGradient(0, WALL, TABLE_W, TABLE_H - WALL);
  sheen.addColorStop(0, "rgba(255,255,255,0.35)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(120,180,220,0.15)");
  ctx.fillStyle = sheen;
  ctx.fill();

  // Wood-rail border
  ctx.lineWidth = WALL * 2;
  const railGrad = ctx.createLinearGradient(0, 0, 0, TABLE_H);
  railGrad.addColorStop(0, "#4b2a14");
  railGrad.addColorStop(0.5, "#7a4321");
  railGrad.addColorStop(1, "#4b2a14");
  ctx.strokeStyle = railGrad;
  roundRect(ctx, WALL, WALL, TABLE_W - WALL * 2, TABLE_H - WALL * 2, r);
  ctx.stroke();

  // Center line
  ctx.strokeStyle = "rgba(190,40,60,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(WALL + 8, TABLE_H / 2);
  ctx.lineTo(TABLE_W - WALL - 8, TABLE_H / 2);
  ctx.stroke();

  // Center circle (red ring like real hockey)
  ctx.strokeStyle = "rgba(190,40,60,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(TABLE_W / 2, TABLE_H / 2, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(TABLE_W / 2, TABLE_H / 2, 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(190,40,60,0.7)";
  ctx.fill();

  // Goal creases (semi circles)
  ctx.strokeStyle = "rgba(40,80,150,0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(TABLE_W / 2, WALL, 110, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(TABLE_W / 2, TABLE_H - WALL, 110, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Goal mouths
  const goalLeft = (TABLE_W - GOAL_W) / 2;
  // top goal (bot)
  ctx.fillStyle = "rgba(255,80,120,0.9)";
  ctx.fillRect(goalLeft, WALL, GOAL_W, 6);
  ctx.fillStyle = "rgba(255,80,120,0.15)";
  ctx.fillRect(goalLeft, WALL, GOAL_W, 26);
  // bottom goal (player)
  ctx.fillStyle = "rgba(80,200,255,0.9)";
  ctx.fillRect(goalLeft, TABLE_H - WALL - 6, GOAL_W, 6);
  ctx.fillStyle = "rgba(80,200,255,0.15)";
  ctx.fillRect(goalLeft, TABLE_H - WALL - 26, GOAL_W, 26);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMallet(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, deep: string) {
  // shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  // base disk
  const base = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, MALLET_R);
  base.addColorStop(0, color);
  base.addColorStop(0.6, color);
  base.addColorStop(1, deep);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(x, y, MALLET_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // outer ring
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, MALLET_R, 0, Math.PI * 2);
  ctx.stroke();

  // knob (handle top)
  const knobR = MALLET_R * 0.42;
  const knobGrad = ctx.createRadialGradient(x - 4, y - 6, 2, x, y, knobR);
  knobGrad.addColorStop(0, "#ffffff");
  knobGrad.addColorStop(0.5, "#e8eef5");
  knobGrad.addColorStop(1, "#9aa6b2");
  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.arc(x, y, knobR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 8, knobR * 0.5, knobR * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  const g = ctx.createRadialGradient(x - 5, y - 7, 2, x, y, PUCK_R);
  g.addColorStop(0, "#4a4a4a");
  g.addColorStop(0.7, "#1a1a1a");
  g.addColorStop(1, "#050505");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, PUCK_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // top rim
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, PUCK_R - 5, 0, Math.PI * 2);
  ctx.stroke();
  // tiny highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 8, 5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}
