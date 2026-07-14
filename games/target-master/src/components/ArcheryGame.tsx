import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  getHandLandmarker,
  readHand,
  HandSmoother,
  type HandState,
} from "@/lib/handTracker";

type Target = {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  born: number;
  ttl: number;
  hit?: boolean;
};

type FloatText = { id: number; x: number; y: number; text: string; born: number };

type Arrow = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
};

type LevelCfg = {
  level: number;
  targetGoal: number;
  maxOnScreen: number;
  spawnEveryMs: number;
  targetTtl: number;
  speed: number;
};

const LEVELS: LevelCfg[] = Array.from({ length: 10 }).map((_, i) => {
  const lvl = i + 1;
  return {
    level: lvl,
    targetGoal: 5 + lvl * 2,
    maxOnScreen: Math.min(2 + Math.floor(lvl / 2), 7),
    spawnEveryMs: Math.max(1700 - lvl * 120, 500),
    targetTtl: Math.max(5500 - lvl * 350, 2200),
    speed: lvl <= 2 ? 0 : 0.04 + (lvl - 2) * 0.025,
  };
});

function endlessCfg(stage: number): LevelCfg {
  // Stage 0,1,2... — ramps forever
  return {
    level: stage + 1,
    targetGoal: Number.POSITIVE_INFINITY,
    maxOnScreen: Math.min(3 + Math.floor(stage / 2), 10),
    spawnEveryMs: Math.max(1200 - stage * 60, 350),
    targetTtl: Math.max(4500 - stage * 200, 1500),
    speed: 0.06 + stage * 0.02,
  };
}

type Phase = "menu" | "loading" | "playing" | "paused" | "levelClear" | "win";

type Props = {
  mode: "levels" | "endless";
  startLevel?: number; // index into LEVELS
};

export default function ArcheryGame({ mode, startLevel = 0 }: Props) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("menu");

  useEffect(() => {
    if (phase === "win") window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const [levelIdx, setLevelIdx] = useState(startLevel);
  const [score, setScore] = useState(0);
  const [hitsThisLevel, setHitsThisLevel] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const smoother = useRef(new HandSmoother());

  const stateRef = useRef({
    targets: [] as Target[],
    arrows: [] as Arrow[],
    floats: [] as FloatText[],
    nextId: 1,
    lastSpawn: 0,
    hand: null as HandState | null,
    lastHandT: 0,
    prevClosed: false,
    drawStart: 0,
    drawPower: 0,
    aimDX: 0,
    aimDY: -1,
    cx: 0.5,
    cy: 0.5,
    width: 1,
    height: 1,
  });

  const phaseRef = useRef(phase);
  const levelIdxRef = useRef(levelIdx);
  const modeRef = useRef(mode);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    levelIdxRef.current = levelIdx;
  }, [levelIdx]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const currentCfg = useCallback(
    (): LevelCfg =>
      mode === "endless" ? endlessCfg(levelIdxRef.current) : LEVELS[levelIdxRef.current],
    [mode],
  );

  const startGame = useCallback(async () => {
    setErrMsg(null);
    setPhase("loading");
    try {
      if (!videoRef.current?.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }
      await getHandLandmarker();
      setScore(0);
      setLevelIdx(startLevel);
      levelIdxRef.current = startLevel;
      setHitsThisLevel(0);
      stateRef.current.targets = [];
      stateRef.current.arrows = [];
      stateRef.current.floats = [];
      stateRef.current.lastSpawn = performance.now();
      smoother.current = new HandSmoother();
      setPhase("playing");
    } catch (e) {
      console.error(e);
      setErrMsg(
        e instanceof Error
          ? `${e.message}. Please allow camera access and reload.`
          : "Could not start the game.",
      );
      setPhase("menu");
    }
  }, [startLevel]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Main loop
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    let lastVideoTime = -1;

    const loop = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!video || !canvas || !container) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (canvas.width !== W * devicePixelRatio || canvas.height !== H * devicePixelRatio) {
        canvas.width = Math.floor(W * devicePixelRatio);
        canvas.height = Math.floor(H * devicePixelRatio);
      }
      stateRef.current.width = W;
      stateRef.current.height = H;

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Hand tracking (run even when paused so cursor is ready when resuming)
      if (
        (phaseRef.current === "playing" || phaseRef.current === "paused") &&
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTime
      ) {
        lastVideoTime = video.currentTime;
        try {
          const lm = await getHandLandmarker();
          const result = lm.detectForVideo(video, performance.now());
          const hand = readHand(result);
          if (hand) {
            stateRef.current.hand = hand;
            stateRef.current.lastHandT = performance.now();
          }
        } catch {
          /* ignore frame errors */
        }
      }

      tick(ctx, W, H);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const s = stateRef.current;
    const now = performance.now();
    const phase = phaseRef.current;
    const cfg = currentCfg();

    const bowX = W / 2;
    const bowY = H - 90;

    // Adaptive smoothing — kills both jitter and lag
    let pos: { x: number; y: number };
    const ageMs = now - s.lastHandT;
    if (s.hand && ageMs < 120) {
      pos = smoother.current.update(s.hand.x, s.hand.y, now);
    } else {
      pos = smoother.current.predict(now);
    }
    s.cx = pos.x;
    s.cy = pos.y;

    const handPx = s.cx * W;
    const handPy = s.cy * H;

    const dx = handPx - bowX;
    const dy = handPy - bowY;
    const len = Math.hypot(dx, dy) || 1;
    s.aimDX = dx / len;
    s.aimDY = dy / len;

    if (phase === "playing") {
      if (
        s.targets.length < cfg.maxOnScreen &&
        now - s.lastSpawn > cfg.spawnEveryMs
      ) {
        s.lastSpawn = now;
        const r = 38 + Math.random() * 22;
        const padX = r / W + 0.05;
        const padY = r / H + 0.05;
        const t: Target = {
          id: s.nextId++,
          x: padX + Math.random() * (1 - 2 * padX),
          y: padY + Math.random() * (0.55 - padY),
          r,
          vx: (Math.random() - 0.5) * cfg.speed,
          vy: (Math.random() - 0.5) * cfg.speed * 0.5,
          born: now,
          ttl: cfg.targetTtl,
        };
        s.targets.push(t);
      }

      s.targets = s.targets.filter((t) => {
        if (t.hit) return now - t.born < t.ttl + 600;
        t.x += t.vx * 0.016;
        t.y += t.vy * 0.016;
        if (t.x < 0.05 || t.x > 0.95) t.vx *= -1;
        if (t.y < 0.05 || t.y > 0.6) t.vy *= -1;
        return now - t.born < t.ttl;
      });

      const hand = s.hand;
      const handFresh = hand && ageMs < 200;
      if (handFresh && hand) {
        if (hand.closed && !s.prevClosed) {
          s.drawStart = now;
          s.drawPower = 0;
        } else if (hand.closed) {
          s.drawPower = Math.min(1, (now - s.drawStart) / 700);
        } else if (!hand.closed && s.prevClosed) {
          if (s.drawPower > 0.1) {
            const power = 0.5 + s.drawPower * 1.6;
            s.arrows.push({
              id: s.nextId++,
              x: bowX,
              y: bowY,
              vx: s.aimDX * power,
              vy: s.aimDY * power,
              born: now,
            });
          }
          s.drawPower = 0;
        }
        s.prevClosed = hand.closed;
      }

      s.arrows = s.arrows.filter((a) => {
        a.x += a.vx * 16;
        a.y += a.vy * 16;
        for (const t of s.targets) {
          if (t.hit) continue;
          const tx = t.x * W;
          const ty = t.y * H;
          const d = Math.hypot(a.x - tx, a.y - ty);
          if (d < t.r) {
            t.hit = true;
            t.born = now - t.ttl + 600;
            const pts = d < t.r * 0.3 ? 100 : d < t.r * 0.6 ? 50 : 25;
            setScore((sc) => sc + pts);
            setHitsThisLevel((h) => {
              const nh = h + 1;
              if (modeRef.current === "levels" && nh >= cfg.targetGoal) {
                setTimeout(() => {
                  if (levelIdxRef.current >= LEVELS.length - 1) {
                    setPhase("win");
                  } else {
                    setPhase("levelClear");
                  }
                }, 250);
              } else if (modeRef.current === "endless" && nh > 0 && nh % 10 === 0) {
                // Bump endless stage every 10 hits
                setLevelIdx((i) => i + 1);
              }
              return nh;
            });
            s.floats.push({
              id: s.nextId++,
              x: tx,
              y: ty,
              text: `+${pts}`,
              born: now,
            });
            return false;
          }
        }
        return a.x > -50 && a.x < W + 50 && a.y > -50 && a.y < H + 50;
      });

      s.floats = s.floats.filter((f) => now - f.born < 900);
    }

    // ============ DRAW ============
    for (const t of s.targets) {
      drawTarget(ctx, t.x * W, t.y * H, t.r, t.hit ? 1 : Math.min(1, (now - t.born) / 250));
    }
    for (const a of s.arrows) {
      drawArrow(ctx, a.x, a.y, Math.atan2(a.vy, a.vx));
    }
    for (const f of s.floats) {
      const age = (now - f.born) / 900;
      ctx.save();
      ctx.globalAlpha = 1 - age;
      ctx.translate(f.x, f.y - age * 60);
      ctx.font = "bold 32px Fredoka, system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = "oklch(0.95 0.18 90)";
      ctx.strokeStyle = "oklch(0.2 0.05 260)";
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, 0, 0);
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }

    if (phase === "playing" || phase === "paused") {
      ctx.save();
      ctx.strokeStyle = "oklch(0.98 0.01 90 / 0.35)";
      ctx.setLineDash([6, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bowX, bowY);
      ctx.lineTo(bowX + s.aimDX * 1400, bowY + s.aimDY * 1400);
      ctx.stroke();
      ctx.restore();

      drawBow(ctx, bowX, bowY, Math.atan2(s.aimDY, s.aimDX), s.drawPower);
      drawCursor(ctx, handPx, handPy, s.hand?.closed ?? false);
    }
  }, [currentCfg]);

  const handleNextLevel = useCallback(() => {
    setHitsThisLevel(0);
    setLevelIdx((i) => Math.min(i + 1, LEVELS.length - 1));
    stateRef.current.targets = [];
    stateRef.current.arrows = [];
    stateRef.current.lastSpawn = performance.now();
    setPhase("playing");
  }, []);

  const handleRestart = useCallback(() => {
    setScore(0);
    setHitsThisLevel(0);
    setLevelIdx(startLevel);
    levelIdxRef.current = startLevel;
    stateRef.current.targets = [];
    stateRef.current.arrows = [];
    stateRef.current.floats = [];
    stateRef.current.lastSpawn = performance.now();
    setPhase("playing");
  }, [startLevel]);

  const handleQuit = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    navigate({ to: "/" });
  }, [navigate]);

  // ESC to pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phaseRef.current === "playing") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("playing");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cfg = currentCfg();
  const goalDisplay = mode === "endless" ? "∞" : String(cfg.targetGoal);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover -scale-x-100 opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.25_0.08_260/0.55)] via-[oklch(0.3_0.06_240/0.35)] to-[oklch(0.18_0.05_260/0.85)]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />

      {/* HUD */}
      {(phase === "playing" || phase === "paused") && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 gap-3">
            <div className="panel px-5 py-3">
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">
                {mode === "endless" ? "Stage" : "Level"}
              </div>
              <div className="text-3xl font-bold text-shadow-bold">
                {cfg.level}
                {mode === "levels" && (
                  <span className="text-base opacity-60"> / {LEVELS.length}</span>
                )}
              </div>
            </div>
            <div className="panel px-5 py-3 text-center">
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">
                {mode === "endless" ? "Hits" : "Targets"}
              </div>
              <div className="text-3xl font-bold text-shadow-bold">
                {hitsThisLevel}
                <span className="opacity-60"> / {goalDisplay}</span>
              </div>
              {mode === "levels" && (
                <div className="mt-2 h-2 w-44 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[color:var(--primary)] transition-all"
                    style={{ width: `${(hitsThisLevel / cfg.targetGoal) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="panel px-5 py-3 text-right">
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted-foreground)]">
                Score
              </div>
              <div className="text-3xl font-bold text-shadow-bold text-[color:var(--primary)]">
                {score}
              </div>
            </div>
          </div>

          {/* Pause button */}
          <button
            onClick={() => setPhase(phase === "playing" ? "paused" : "playing")}
            className="absolute bottom-5 right-5 z-20 panel w-14 h-14 flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            aria-label={phase === "playing" ? "Pause" : "Resume"}
          >
            {phase === "playing" ? "⏸" : "▶"}
          </button>
        </>
      )}

      {/* Overlays */}
      {phase === "menu" && (
        <Overlay>
          <div className="text-center max-w-xl">
            <div className="text-5xl md:text-6xl font-black text-shadow-bold tracking-tight">
              {mode === "endless" ? "♾️ Endless Mode" : `🏹 Level ${startLevel + 1}`}
            </div>
            <p className="mt-5 text-lg opacity-90 leading-relaxed">
              Aim with your open hand. <b>Close your fist</b> to draw the bow,
              then <b>open</b> to release the arrow.
            </p>
            <button
              onClick={startGame}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] px-10 py-5 text-2xl font-bold glow-primary hover:scale-105 transition-transform"
            >
              ▶ Start
            </button>
            <div className="mt-4">
              <button
                onClick={handleQuit}
                className="text-sm opacity-70 hover:opacity-100 underline"
              >
                Back to menu
              </button>
            </div>
            {errMsg && (
              <p className="mt-6 text-sm text-[color:var(--destructive)] bg-black/30 rounded-md p-3">
                {errMsg}
              </p>
            )}
            <p className="mt-6 text-xs opacity-60">
              A webcam is required. Tracking runs locally in your browser.
            </p>
          </div>
        </Overlay>
      )}

      {phase === "loading" && (
        <Overlay>
          <div className="text-center">
            <div className="text-3xl font-bold animate-pulse">Loading hand tracker…</div>
            <p className="mt-2 opacity-70">Allow camera access if prompted.</p>
          </div>
        </Overlay>
      )}

      {phase === "paused" && (
        <Overlay>
          <div className="text-center animate-pop-in">
            <div className="text-6xl font-black text-shadow-bold">⏸ Paused</div>
            <div className="mt-6 flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => setPhase("playing")}
                className="rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] px-8 py-4 text-xl font-bold glow-primary hover:scale-105 transition-transform"
              >
                ▶ Resume
              </button>
              <button
                onClick={handleRestart}
                className="rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)] px-8 py-4 text-xl font-bold hover:scale-105 transition-transform"
              >
                ↻ Restart
              </button>
              <button
                onClick={handleQuit}
                className="rounded-full bg-white/10 px-8 py-4 text-xl font-bold hover:bg-white/20 transition-colors"
              >
                ✕ Quit to menu
              </button>
            </div>
            <p className="mt-4 text-xs opacity-60">Press Esc to resume</p>
          </div>
        </Overlay>
      )}

      {phase === "levelClear" && (
        <Overlay>
          <div className="text-center animate-pop-in">
            <div className="text-7xl font-black text-[color:var(--primary)] text-shadow-bold">
              Level {cfg.level} Cleared!
            </div>
            <div className="mt-3 text-2xl opacity-90">Score: {score}</div>
            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <button
                onClick={handleNextLevel}
                className="rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)] px-10 py-5 text-2xl font-bold glow-primary hover:scale-105 transition-transform"
              >
                Next Level →
              </button>
              <button
                onClick={handleQuit}
                className="rounded-full bg-white/10 px-8 py-5 text-xl font-bold hover:bg-white/20 transition-colors"
              >
                Map
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {phase === "win" && (
        <Overlay>
          <div className="text-center animate-pop-in">
            <div className="text-7xl font-black text-[color:var(--primary)] text-shadow-bold">
              🏆 You Win!
            </div>
            <div className="mt-3 text-2xl opacity-90">Final score: {score}</div>
            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <button
                onClick={handleRestart}
                className="rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] px-10 py-5 text-2xl font-bold glow-primary hover:scale-105 transition-transform"
              >
                Play Again
              </button>
              <button
                onClick={handleQuit}
                className="rounded-full bg-white/10 px-8 py-5 text-xl font-bold hover:bg-white/20 transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[oklch(0.15_0.04_260/0.55)] backdrop-blur-sm p-6 z-30">
      <div className="panel p-10 max-w-2xl w-full">{children}</div>
    </div>
  );
}

// =========== Drawing helpers ===========

function drawTarget(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  const rings = [
    { r: r, c: "oklch(0.98 0.01 90)" },
    { r: r * 0.82, c: "oklch(0.22 0.05 260)" },
    { r: r * 0.65, c: "oklch(0.7 0.18 220)" },
    { r: r * 0.48, c: "oklch(0.62 0.24 25)" },
    { r: r * 0.3, c: "oklch(0.95 0.20 90)" },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.fillStyle = ring.c;
    ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "oklch(0.2 0.05 260 / 0.6)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "oklch(0.85 0.05 80)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();
  ctx.fillStyle = "oklch(0.85 0.15 60)";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(16, -7);
  ctx.lineTo(16, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "oklch(0.65 0.22 25)";
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(-20, -6);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-20, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  draw: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  const R = 70;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "oklch(0.45 0.10 50)";
  ctx.beginPath();
  ctx.arc(0, 0, R, Math.PI * 0.25, Math.PI * 0.75, false);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "oklch(0.98 0.01 90 / 0.9)";
  const sx1 = Math.cos(Math.PI * 0.25) * R;
  const sy1 = Math.sin(Math.PI * 0.25) * R;
  const sx2 = Math.cos(Math.PI * 0.75) * R;
  const sy2 = Math.sin(Math.PI * 0.75) * R;
  const pull = draw * 30;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(0, R * 0.7 + pull);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  if (draw > 0.05) {
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    drawArrow(ctx, -(R * 0.7 + pull - 28), 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, closed: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = closed ? "oklch(0.7 0.22 25)" : "oklch(0.95 0.18 90)";
  ctx.fillStyle = closed ? "oklch(0.7 0.22 25 / 0.2)" : "oklch(0.95 0.18 90 / 0.18)";
  const r = closed ? 22 : 30;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r - 6, 0); ctx.lineTo(-r + 4, 0);
  ctx.moveTo(r + 6, 0); ctx.lineTo(r - 4, 0);
  ctx.moveTo(0, -r - 6); ctx.lineTo(0, -r + 4);
  ctx.moveTo(0, r + 6); ctx.lineTo(0, r - 4);
  ctx.stroke();
  ctx.restore();
}
