import { useCallback, useEffect, useRef, useState } from "react";
import { classifyGesture, GESTURE_META, type Gesture } from "@/lib/gestures";
import { loadHandLandmarker } from "@/lib/mediapipe";

type Phase = "menu" | "howto" | "levelMap" | "loading" | "playing" | "levelComplete" | "gameover";
type Mode = "endless" | "level";

type EnemyKind = "ronin" | "ogre" | "ninja";
const ENEMY_KINDS: EnemyKind[] = ["ronin", "ogre", "ninja"];

type Enemy = {
  id: number;
  approach: number; // 1 = far, 0 = at samurai
  approachDuration: number; // seconds to traverse
  spawnTime: number;
  sequence: Gesture[];
  step: number;
  tier: number;
  kind: EnemyKind;
};

const ALL_GESTURES: Gesture[] = ["fist", "open", "peace", "thumbs_up", "point"];
const HOLD_FRAMES = 5;
const ENEMIES_PER_LEVEL = 5;
const TOTAL_LEVELS = 20;
const PROGRESS_KEY = "samurai-slice:max-level-unlocked";

function loadMaxUnlocked(): number {
  if (typeof window === "undefined") return 1;
  const v = parseInt(window.localStorage.getItem(PROGRESS_KEY) || "1", 10);
  return Number.isFinite(v) && v >= 1 ? Math.min(TOTAL_LEVELS, v) : 1;
}
function saveMaxUnlocked(n: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, String(Math.min(TOTAL_LEVELS, Math.max(1, n))));
}

function randomSequence(length: number): Gesture[] {
  const seq: Gesture[] = [];
  let prev: Gesture | null = null;
  for (let i = 0; i < length; i++) {
    let g: Gesture;
    do {
      g = ALL_GESTURES[Math.floor(Math.random() * ALL_GESTURES.length)];
    } while (g === prev);
    seq.push(g);
    prev = g;
  }
  return seq;
}

function difficultyForLevel(level: number) {
  const tier = Math.min(5, 1 + Math.floor((level - 1) / 2));
  const seqLen = Math.min(6, 1 + Math.floor((level - 1) / 2));
  const approach = Math.max(2.2, 6 - (level - 1) * 0.4);
  // 3s between spawns at easy levels, ramping down to 2s as it gets harder
  const gap = Math.max(2000, 3000 - (level - 1) * 100);
  return { tier, seqLen, approach, gap };
}

function difficultyForEndless(killed: number) {
  const tier = Math.min(5, 1 + Math.floor(killed / 6));
  const seqLen = Math.min(6, 1 + Math.floor(killed / 5));
  const approach = Math.max(2.0, 6.5 - killed * 0.12);
  // start at 3s between spawns, tighten to 2s as kills pile up
  const gap = Math.max(2000, 3000 - killed * 40);
  return { tier, seqLen, approach, gap };
}

export default function SamuraiGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const gestureHoldRef = useRef<{ g: Gesture | null; count: number }>({ g: null, count: 0 });

  const [phase, setPhase] = useState<Phase>("menu");

  useEffect(() => {
    if (phase === "gameover") window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const [mode, setMode] = useState<Mode>("endless");
  const [level, setLevel] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState<number>(() => loadMaxUnlocked());
  const [killedThisLevel, setKilledThisLevel] = useState(0);
  const [totalKilled, setTotalKilled] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [bgScroll, setBgScroll] = useState(0);
  const [health, setHealth] = useState(3);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [liveGesture, setLiveGesture] = useState<Gesture | null>(null);
  const [slashKey, setSlashKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [, forceTick] = useState(0);

  const enemyIdRef = useRef(1);
  const nextEnemyAtRef = useRef(0);
  const enemyRef = useRef<Enemy | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const modeRef = useRef<Mode>("endless");
  const levelRef = useRef(1);
  const killedRef = useRef(0);
  const totalKilledRef = useRef(0);

  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { killedRef.current = killedThisLevel; }, [killedThisLevel]);
  useEffect(() => { totalKilledRef.current = totalKilled; }, [totalKilled]);

  const advanceEnemyStep = useCallback(() => {
    const e = enemyRef.current;
    if (!e) return;
    if (e.step + 1 >= e.sequence.length) {
      setSlashKey((k) => k + 1);
      setScore((s) => s + e.tier * 100);
      setTotalKilled((n) => n + 1);
      enemyRef.current = null;
      setEnemy(null);
      gestureHoldRef.current = { g: null, count: 0 };
      if (modeRef.current === "level") {
        const next = killedRef.current + 1;
        setKilledThisLevel(next);
        if (next >= ENEMIES_PER_LEVEL) {
          const unlocked = Math.min(TOTAL_LEVELS, levelRef.current + 1);
          setMaxUnlocked((m) => {
            const nm = Math.max(m, unlocked);
            saveMaxUnlocked(nm);
            return nm;
          });
          setPhase("levelComplete");
        }
      }
    } else {
      const next = { ...e, step: e.step + 1 };
      enemyRef.current = next;
      setEnemy(next);
      gestureHoldRef.current = { g: null, count: 0 };
    }
  }, []);

  const failChallenge = useCallback(() => {
    setShakeKey((k) => k + 1);
    enemyRef.current = null;
    setEnemy(null);
    setHealth((h) => {
      const next = h - 1;
      if (next <= 0) setPhase("gameover");
      return next;
    });
    gestureHoldRef.current = { g: null, count: 0 };
  }, []);

  // Detection loop — always runs once camera is ready
  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const ts = performance.now();

      if (video && landmarker && video.readyState >= 2) {
        try {
          const result = landmarker.detectForVideo(video, ts);
          const lm = result?.landmarks?.[0];
          const g = lm ? classifyGesture(lm) : null;
          setLiveGesture(g);

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (lm) {
                const connections: [number, number][] = [
                  [0, 1], [1, 2], [2, 3], [3, 4],
                  [0, 5], [5, 6], [6, 7], [7, 8],
                  [5, 9], [9, 10], [10, 11], [11, 12],
                  [9, 13], [13, 14], [14, 15], [15, 16],
                  [13, 17], [17, 18], [18, 19], [19, 20],
                  [0, 17],
                ];
                ctx.strokeStyle = "rgba(255,255,255,0.9)";
                ctx.lineWidth = 2.5;
                for (const [a, b] of connections) {
                  ctx.beginPath();
                  ctx.moveTo((1 - lm[a].x) * canvas.width, lm[a].y * canvas.height);
                  ctx.lineTo((1 - lm[b].x) * canvas.width, lm[b].y * canvas.height);
                  ctx.stroke();
                }
                ctx.fillStyle = "rgba(255,80,80,0.95)";
                for (const p of lm) {
                  ctx.beginPath();
                  ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }

          if (phaseRef.current === "playing" && enemyRef.current) {
            const need = enemyRef.current.sequence[enemyRef.current.step];
            const hold = gestureHoldRef.current;
            if (g && g === need) {
              hold.g = g;
              hold.count += 1;
              if (hold.count >= HOLD_FRAMES) {
                advanceEnemyStep();
              }
            } else {
              hold.g = g;
              hold.count = 0;
            }
          }
        } catch {
          /* ignore frame errors */
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [advanceEnemyStep]);

  // Game tick — scrolls background and advances enemy approach
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;

      setBgScroll((d) => d + dt * (enemyRef.current ? 4 : 14));

      // Spawn enemy if none and timer elapsed
      if (!enemyRef.current && t >= nextEnemyAtRef.current) {
        const diff = modeRef.current === "level"
          ? difficultyForLevel(levelRef.current)
          : difficultyForEndless(totalKilledRef.current);
        const e: Enemy = {
          id: enemyIdRef.current++,
          approach: 1,
          approachDuration: diff.approach,
          spawnTime: t,
          sequence: randomSequence(diff.seqLen),
          step: 0,
          tier: diff.tier,
          kind: ENEMY_KINDS[Math.floor(Math.random() * ENEMY_KINDS.length)],
        };
        enemyRef.current = e;
        setEnemy(e);
      }

      // Advance current enemy approach
      const cur = enemyRef.current;
      if (cur) {
        const elapsed = (t - cur.spawnTime) / 1000;
        const newApproach = Math.max(0, 1 - elapsed / cur.approachDuration);
        cur.approach = newApproach;
        if (newApproach <= 0) {
          failChallenge();
          const diff = modeRef.current === "level"
            ? difficultyForLevel(levelRef.current)
            : difficultyForEndless(totalKilledRef.current);
          nextEnemyAtRef.current = performance.now() + diff.gap;
        }
        forceTick((n) => (n + 1) % 1000);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, failChallenge]);

  // Schedule next enemy when current is cleared
  useEffect(() => {
    if (phase === "playing" && !enemy) {
      const diff = modeRef.current === "level"
        ? difficultyForLevel(levelRef.current)
        : difficultyForEndless(totalKilledRef.current);
      nextEnemyAtRef.current = performance.now() + diff.gap;
    }
  }, [phase, enemy]);

  const ensureCamera = useCallback(async () => {
    if (landmarkerRef.current && videoRef.current?.srcObject) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    const video = videoRef.current!;
    video.srcObject = stream;
    await video.play();
    const landmarker = await loadHandLandmarker();
    landmarkerRef.current = landmarker;
  }, []);

  const startGame = useCallback(async (chosenMode: Mode, startLevel: number = 1) => {
    setError(null);
    setMode(chosenMode);
    modeRef.current = chosenMode;
    setPhase("loading");
    try {
      await ensureCamera();
      setScore(0);
      setHealth(3);
      setLevel(startLevel);
      levelRef.current = startLevel;
      setKilledThisLevel(0);
      killedRef.current = 0;
      setTotalKilled(0);
      totalKilledRef.current = 0;
      enemyRef.current = null;
      setEnemy(null);
      nextEnemyAtRef.current = performance.now() + 1800;
      setPhase("playing");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to start camera / model");
      setPhase("menu");
    }
  }, [ensureCamera]);

  const nextLevel = useCallback(() => {
    setLevel((l) => {
      const nl = l + 1;
      levelRef.current = nl;
      return nl;
    });
    setKilledThisLevel(0);
    killedRef.current = 0;
    setHealth(3);
    enemyRef.current = null;
    setEnemy(null);
    nextEnemyAtRef.current = performance.now() + 1500;
    setPhase("playing");
  }, []);

  const quitToMenu = useCallback(() => {
    enemyRef.current = null;
    setEnemy(null);
    setPhase("menu");
  }, []);

  const restartCurrent = useCallback(() => {
    enemyRef.current = null;
    setEnemy(null);
    setScore(0);
    setHealth(3);
    setKilledThisLevel(0);
    killedRef.current = 0;
    if (modeRef.current === "endless") {
      setTotalKilled(0);
      totalKilledRef.current = 0;
    } else {
      setLevel(1);
      levelRef.current = 1;
    }
    nextEnemyAtRef.current = performance.now() + 1500;
    setPhase("playing");
  }, []);

  const approach = enemy?.approach ?? 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden ink-vignette text-foreground">
      <ParallaxBg distance={bgScroll} slowed={!!enemy && approach < 0.6} />

      <Stage enemy={enemy} approach={approach} />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-6 py-5">
        <div>
          <div className="font-blade text-xs uppercase text-muted-foreground">
            {mode === "level" ? "Level" : "Mode"}
          </div>
          <div className="font-blade text-3xl text-foreground">
            {mode === "level" ? level : "Endless"}
          </div>
          {mode === "level" && phase === "playing" && (
            <div className="font-blade text-[10px] uppercase tracking-widest text-muted-foreground">
              {killedThisLevel}/{ENEMIES_PER_LEVEL} slain
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="font-blade text-xs uppercase text-muted-foreground">Score</div>
          <div className="font-blade text-3xl text-primary drop-shadow-[0_0_8px_oklch(0.62_0.22_25/0.7)]">
            {score}
          </div>
        </div>
        <div className="text-right">
          <div className="font-blade text-xs uppercase text-muted-foreground">Lives</div>
          <div className="flex justify-end gap-1 text-2xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < health ? "text-primary" : "text-muted opacity-30"}>
                ⚔
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating gesture prompt above enemy */}
      {phase === "playing" && enemy && (
        <EnemyPrompt enemy={enemy} liveGesture={liveGesture} progress={approach} />
      )}

      {/* In-game controls */}
      {phase === "playing" && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 gap-2">
          <button
            onClick={restartCurrent}
            className="rounded border border-border bg-card/70 px-3 py-1 font-blade text-[11px] uppercase tracking-widest text-foreground/80 backdrop-blur hover:bg-primary/20"
          >
            Restart
          </button>
          <button
            onClick={quitToMenu}
            className="rounded border border-border bg-card/70 px-3 py-1 font-blade text-[11px] uppercase tracking-widest text-foreground/80 backdrop-blur hover:bg-destructive/30"
          >
            Quit
          </button>
        </div>
      )}

      {slashKey > 0 && (
        <div key={slashKey} className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden>
          <div className="absolute left-1/2 top-1/2 h-2 w-[140vmax] -translate-x-1/2 -translate-y-1/2 animate-slash bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_30px_white]" />
        </div>
      )}
      {shakeKey > 0 && (
        <div key={`s-${shakeKey}`} className="pointer-events-none absolute inset-0 z-40 animate-shake bg-destructive/20" />
      )}

      {/* Webcam — larger */}
      <div className="absolute bottom-4 right-4 z-30 h-60 w-80 overflow-hidden rounded-lg border-2 border-border bg-black shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        <canvas ref={canvasRef} width={320} height={240} className="absolute inset-0 h-full w-full" />
        <div className="absolute bottom-1 left-1 rounded bg-black/70 px-2 py-0.5 font-blade text-xs uppercase text-accent">
          {liveGesture ? GESTURE_META[liveGesture].label : "no hand"}
        </div>
      </div>

      {phase === "menu" && (
        <MenuScreen
          onEndless={() => startGame("endless")}
          onLevels={() => setPhase("levelMap")}
          onHowTo={() => setPhase("howto")}
          maxUnlocked={maxUnlocked}
          error={error}
        />
      )}
      {phase === "howto" && <HowToScreen onBack={() => setPhase("menu")} />}
      {phase === "levelMap" && (
        <LevelMapScreen
          maxUnlocked={maxUnlocked}
          onPick={(lv) => startGame("level", lv)}
          onBack={() => setPhase("menu")}
          onReset={() => {
            saveMaxUnlocked(1);
            setMaxUnlocked(1);
          }}
        />
      )}
      {phase === "loading" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur">
          <div className="font-blade text-2xl uppercase tracking-[0.4em] text-primary">Awakening…</div>
          <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Please allow camera</div>
        </div>
      )}
      {phase === "gameover" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-md">
          <div className="font-blade text-6xl uppercase tracking-[0.3em] text-primary">Slain</div>
          <div className="mt-6 font-blade text-xs uppercase tracking-widest text-muted-foreground">Final Score</div>
          <div className="font-blade text-5xl text-foreground">{score}</div>
          <div className="mt-1 font-blade text-xs uppercase tracking-widest text-muted-foreground">
            {mode === "level" ? `Fell at level ${level}` : `${totalKilled} enemies cut down`}
          </div>
          <div className="mt-10 flex gap-3">
            <button
              onClick={restartCurrent}
              className="rounded-md border-2 border-primary bg-primary/10 px-6 py-3 font-blade text-sm uppercase tracking-[0.3em] hover:bg-primary/30 hover:blade-glow"
            >
              Run again
            </button>
            <button
              onClick={quitToMenu}
              className="rounded-md border-2 border-border bg-card/60 px-6 py-3 font-blade text-sm uppercase tracking-[0.3em] hover:bg-card"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
      {phase === "levelComplete" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/85 px-6 text-center backdrop-blur-md">
          <div className="font-blade text-xs uppercase tracking-[0.4em] text-accent">Level {level} Cleared</div>
          <div className="mt-2 font-blade text-6xl uppercase tracking-[0.25em] text-primary">Victory</div>
          <div className="mt-6 font-blade text-xs uppercase tracking-widest text-muted-foreground">Score</div>
          <div className="font-blade text-4xl text-foreground">{score}</div>
          <div className="mt-10 flex gap-3">
            <button
              onClick={nextLevel}
              className="rounded-md border-2 border-primary bg-primary/10 px-6 py-3 font-blade text-sm uppercase tracking-[0.3em] hover:bg-primary/30 hover:blade-glow"
            >
              Level {level + 1} →
            </button>
            <button
              onClick={() => setPhase("levelMap")}
              className="rounded-md border-2 border-accent bg-accent/10 px-6 py-3 font-blade text-sm uppercase tracking-[0.3em] hover:bg-accent/30"
            >
              Map
            </button>
            <button
              onClick={quitToMenu}
              className="rounded-md border-2 border-border bg-card/60 px-6 py-3 font-blade text-sm uppercase tracking-[0.3em] hover:bg-card"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuScreen({
  onEndless,
  onLevels,
  onHowTo,
  maxUnlocked,
  error,
}: {
  onEndless: () => void;
  onLevels: () => void;
  onHowTo: () => void;
  maxUnlocked: number;
  error: string | null;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-md">
      <h1 className="font-blade text-6xl uppercase tracking-[0.25em] text-foreground sm:text-7xl">
        Samurai <span className="text-primary">Slice</span>
      </h1>
      <p className="mt-3 max-w-md font-blade text-sm uppercase tracking-[0.3em] text-muted-foreground">
        Stand your ground. Read the strike. Cut them down with your hand.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onEndless}
          className="min-w-[200px] rounded-md border-2 border-primary bg-primary/10 px-8 py-4 font-blade text-sm uppercase tracking-[0.35em] text-foreground transition-all hover:bg-primary/30 hover:blade-glow"
        >
          Endless
          <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">3 lives · infinite</div>
        </button>
        <button
          onClick={onLevels}
          className="min-w-[200px] rounded-md border-2 border-accent bg-accent/10 px-8 py-4 font-blade text-sm uppercase tracking-[0.35em] text-foreground transition-all hover:bg-accent/30"
        >
          Levels
          <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">
            {maxUnlocked > 1 ? `Cleared ${maxUnlocked - 1}/${TOTAL_LEVELS}` : "Open the map"}
          </div>
        </button>
        <button
          onClick={onHowTo}
          className="min-w-[200px] rounded-md border-2 border-border bg-card/60 px-8 py-4 font-blade text-sm uppercase tracking-[0.35em] text-foreground hover:bg-card"
        >
          How to play
        </button>
      </div>

      {error && <p className="mt-6 max-w-md text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">
        Allow camera · Keep your hand in frame
      </p>
    </div>
  );
}

function HowToScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto bg-background/95 px-6 py-12 text-center backdrop-blur-md">
      <h2 className="font-blade text-4xl uppercase tracking-[0.3em] text-primary">How to Play</h2>
      <div className="mt-8 max-w-2xl space-y-4 text-left text-sm text-foreground/90">
        <p>
          <span className="font-blade uppercase text-accent">1. Stand your ground.</span>{" "}
          You are the samurai — you do not move. Enemies emerge from the horizon and march toward you.
        </p>
        <p>
          <span className="font-blade uppercase text-accent">2. Read the strike.</span>{" "}
          Each enemy carries a sequence of gestures above their head. Perform each gesture in order with your hand in front of the camera.
        </p>
        <p>
          <span className="font-blade uppercase text-accent">3. Strike before they reach you.</span>{" "}
          If an enemy reaches your blade before you complete the sequence, you lose a life. Lose three lives and you are slain.
        </p>
        <p>
          <span className="font-blade uppercase text-accent">4. Modes.</span>{" "}
          <em>Endless</em> spawns harder enemies the more you slay. <em>Levels</em> groups enemies into waves that get faster and meaner.
        </p>
      </div>

      <h3 className="mt-10 font-blade text-sm uppercase tracking-[0.4em] text-muted-foreground">The Five Strikes</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {ALL_GESTURES.map((g) => (
          <div key={g} className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-card text-4xl">
              {GESTURE_META[g].emoji}
            </div>
            <div className="font-blade text-[11px] uppercase tracking-widest text-foreground">
              {GESTURE_META[g].label}
            </div>
            <div className="text-[10px] text-muted-foreground">{GESTURE_META[g].hint}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-12 mb-6 rounded-md border-2 border-primary bg-primary/10 px-8 py-3 font-blade text-sm uppercase tracking-[0.4em] text-foreground hover:bg-primary/30 hover:blade-glow"
      >
        Back
      </button>
    </div>
  );
}

function EnemyPrompt({
  enemy,
  liveGesture,
  progress,
}: {
  enemy: Enemy;
  liveGesture: Gesture | null;
  progress: number;
}) {
  // approach 1 → far right; 0 → near samurai (left-ish)
  const rightPct = 18 + (1 - enemy.approach) * 42;
  const need = enemy.sequence[enemy.step];
  return (
    <div
      className="pointer-events-none absolute z-30 flex flex-col items-center"
      style={{
        right: `${rightPct}%`,
        bottom: `calc(40% + 100px)`,
        transform: "translateX(50%)",
      }}
    >
      <div className="font-blade text-[10px] uppercase tracking-[0.4em] text-accent">
        {enemy.step + 1}/{enemy.sequence.length}
      </div>
      <div className="mt-1 flex gap-2">
        {enemy.sequence.map((g, i) => {
          const done = i < enemy.step;
          const active = i === enemy.step;
          return (
            <div
              key={i}
              className={`relative flex h-14 w-14 items-center justify-center rounded-xl border-2 text-3xl transition-all ${
                done
                  ? "border-accent/40 bg-accent/10 opacity-50"
                  : active
                    ? "border-primary bg-primary/25 blade-glow scale-110"
                    : "border-border bg-card/85"
              }`}
            >
              <span>{GESTURE_META[g].emoji}</span>
              {active && (
                <span className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse-ring" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1 font-blade text-[10px] uppercase tracking-widest text-foreground/80">
        {GESTURE_META[need].label}
        {liveGesture === need && <span className="ml-2 text-primary">✓</span>}
      </div>
    </div>
  );
}

function ParallaxBg({ distance, slowed }: { distance: number; slowed: boolean }) {
  const speed = slowed ? 0.2 : 1;
  const d = distance * speed;
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute left-1/2 top-[18%] h-48 w-48 -translate-x-1/2 rounded-full bg-primary/70 blur-xl opacity-70" />
      <div className="absolute left-1/2 top-[18%] h-32 w-32 -translate-x-1/2 rounded-full bg-primary" />
      <svg
        className="absolute bottom-[35%] w-[200%] text-[oklch(0.18_0.015_30)]"
        style={{ transform: `translateX(${-(d * 0.3) % 1000}px)` }}
        viewBox="0 0 2000 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,200 L0,140 L150,60 L300,120 L500,40 L700,110 L900,50 L1100,130 L1300,70 L1500,120 L1700,50 L1900,110 L2000,90 L2000,200 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className="absolute bottom-[28%] w-[200%] text-[oklch(0.13_0.012_30)]"
        style={{ transform: `translateX(${-(d * 0.6) % 1000}px)` }}
        viewBox="0 0 2000 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,200 L0,160 L120,90 L260,150 L420,70 L600,140 L800,80 L1000,150 L1180,90 L1360,140 L1540,80 L1720,140 L1900,90 L2000,120 L2000,200 Z"
          fill="currentColor"
        />
      </svg>
      <div className="absolute bottom-0 h-[28%] w-full bg-gradient-to-b from-[oklch(0.10_0.01_30)] to-black" />
      <div
        className="absolute bottom-[6%] h-px w-full bg-foreground/10"
        style={{ transform: `translateX(${-d % 80}px)` }}
      />
    </div>
  );
}

function Stage({ enemy, approach }: { enemy: Enemy | null; approach: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 h-1/2">
      {/* samurai — stationary */}
      <div className="absolute bottom-[22%] left-[18%] h-56 w-32">
        <SamuraiSvg />
      </div>

      {enemy && (
        <div
          key={enemy.id}
          className="absolute bottom-[22%] h-56 w-32"
          style={{
            right: `${18 + (1 - approach) * 42}%`,
            transform: `scale(${0.55 + (1 - approach) * 0.55})`,
            transformOrigin: "bottom center",
          }}
        >
          <EnemySvg tier={enemy.tier} kind={enemy.kind} />
        </div>
      )}
    </div>
  );
}

function SamuraiSvg() {
  return (
    <svg viewBox="0 0 120 200" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="bladeGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.98 0.02 80)" />
          <stop offset="50%" stopColor="oklch(0.85 0.05 80)" />
          <stop offset="100%" stopColor="oklch(0.98 0.02 80)" />
        </linearGradient>
        <linearGradient id="robeGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.18 0.02 25)" />
          <stop offset="100%" stopColor="oklch(0.08 0.01 25)" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="195" rx="28" ry="3" fill="black" opacity="0.5" />
      <path d="M58,28 Q72,18 70,8 Q66,18 56,22 Z" fill="oklch(0.08 0.01 25)" />
      <path d="M20,38 Q60,12 100,38 Q60,30 20,38 Z" fill="oklch(0.45 0.08 70)" stroke="oklch(0.25 0.04 50)" strokeWidth="1" />
      <path d="M30,38 Q60,32 90,38" fill="none" stroke="oklch(0.30 0.05 50)" strokeWidth="0.8" />
      <path d="M48,40 Q60,38 72,40 L70,54 Q60,58 50,54 Z" fill="oklch(0.18 0.02 25)" />
      <rect x="52" y="46" width="16" height="2" fill="oklch(0.85 0.18 60)" />
      <rect x="52" y="46" width="16" height="0.6" fill="oklch(0.95 0.2 70)" />
      <path
        d="M30,62 Q60,55 90,62 L96,95 L88,90 L82,140 L74,178 L66,178 L62,140 L60,90 L58,140 L54,178 L46,178 L38,140 L32,90 L24,95 Z"
        fill="url(#robeGrad)"
        stroke="oklch(0.55 0.20 25)"
        strokeWidth="1.2"
      />
      <circle cx="60" cy="85" r="4.5" fill="none" stroke="oklch(0.62 0.22 25)" strokeWidth="1" />
      <path d="M60,82 L60,88 M57,85 L63,85" stroke="oklch(0.62 0.22 25)" strokeWidth="1" />
      <rect x="30" y="100" width="60" height="10" fill="oklch(0.55 0.22 25)" />
      <rect x="30" y="100" width="60" height="2" fill="oklch(0.70 0.22 25)" />
      <rect x="30" y="108" width="60" height="2" fill="oklch(0.35 0.15 25)" />
      <path d="M46,148 L42,180 L48,180 L52,150 Z" fill="oklch(0.12 0.015 25)" />
      <path d="M74,148 L78,180 L72,180 L68,150 Z" fill="oklch(0.12 0.015 25)" />
      <ellipse cx="44" cy="184" rx="7" ry="3" fill="oklch(0.95 0.01 80)" />
      <ellipse cx="76" cy="184" rx="7" ry="3" fill="oklch(0.95 0.01 80)" />
      <path d="M88,68 Q100,58 108,52" stroke="oklch(0.10 0.01 25)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="103" y="46" width="3" height="12" fill="oklch(0.30 0.03 50)" transform="rotate(-35 105 52)" />
      <line x1="108" y1="52" x2="116" y2="60" stroke="oklch(0.20 0.02 25)" strokeWidth="4" strokeLinecap="round" />
      <line x1="103" y1="48" x2="50" y2="-5" stroke="url(#bladeGrad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="103" y1="48" x2="50" y2="-5" stroke="oklch(0.95 0.05 60)" strokeWidth="0.8" opacity="0.9" />
      <line x1="30" y1="106" x2="14" y2="118" stroke="oklch(0.20 0.02 25)" strokeWidth="3" />
      <line x1="34" y1="104" x2="10" y2="124" stroke="oklch(0.30 0.03 30)" strokeWidth="1.5" />
    </svg>
  );
}

function EnemySvg({ tier, kind }: { tier: number; kind: EnemyKind }) {
  if (kind === "ogre") return <OgreSvg tier={tier} />;
  if (kind === "ninja") return <NinjaSvg tier={tier} />;
  return <RoninSvg tier={tier} />;
}

function RoninSvg({ tier }: { tier: number }) {
  const accent = `oklch(0.62 0.22 ${tier > 3 ? 80 : 25})`;
  const body = `oklch(${0.20 - Math.min(1, tier / 5) * 0.07} 0.04 30)`;
  return (
    <svg viewBox="0 0 100 180" className="h-full w-full -scale-x-100 overflow-visible">
      <ellipse cx="50" cy="178" rx="22" ry="3" fill="black" opacity="0.5" />
      {/* straw hat */}
      <path d="M18,40 Q50,18 82,40 Q50,32 18,40 Z" fill="oklch(0.40 0.08 70)" stroke={accent} strokeWidth="1" />
      {/* head/mask */}
      <ellipse cx="50" cy="44" rx="10" ry="11" fill={body} stroke={accent} strokeWidth="1.2" />
      <rect x="42" y="44" width="16" height="2.4" fill="oklch(0.85 0.2 25)" />
      {/* body / haori */}
      <path d="M28,58 Q50,50 72,58 L78,110 L70,150 L64,172 L56,172 L52,140 L48,140 L44,172 L36,172 L30,150 L22,110 Z"
        fill={body} stroke={accent} strokeWidth="1.4" />
      {/* sash */}
      <rect x="26" y="92" width="48" height="7" fill={accent} opacity="0.85" />
      {/* katana raised */}
      <line x1="70" y1="70" x2="100" y2="20" stroke="oklch(0.3 0.03 40)" strokeWidth="4" strokeLinecap="round" />
      <line x1="98" y1="22" x2="135" y2="-18" stroke="oklch(0.95 0.02 80)" strokeWidth="2.5" strokeLinecap="round" />
      {/* legs */}
      <path d="M42,150 L38,172 L46,172 L48,150 Z" fill="oklch(0.10 0.01 25)" />
      <path d="M58,150 L62,172 L54,172 L52,150 Z" fill="oklch(0.10 0.01 25)" />
    </svg>
  );
}

function OgreSvg({ tier }: { tier: number }) {
  const horns = `oklch(0.78 0.16 60)`;
  const skin = `oklch(${0.36 - Math.min(1, tier / 5) * 0.08} 0.14 ${20 + tier * 8})`;
  return (
    <svg viewBox="0 0 110 180" className="h-full w-full -scale-x-100 overflow-visible">
      <ellipse cx="55" cy="178" rx="30" ry="3.5" fill="black" opacity="0.55" />
      {/* horns */}
      <path d="M38,28 L32,6 L44,22 Z" fill={horns} />
      <path d="M72,28 L78,6 L66,22 Z" fill={horns} />
      {/* head */}
      <ellipse cx="55" cy="40" rx="18" ry="16" fill={skin} stroke="oklch(0.15 0.02 20)" strokeWidth="1.5" />
      {/* eyes */}
      <circle cx="48" cy="40" r="2.4" fill="oklch(0.95 0.2 90)" />
      <circle cx="62" cy="40" r="2.4" fill="oklch(0.95 0.2 90)" />
      {/* tusks */}
      <path d="M50,52 L48,58 L52,55 Z" fill="oklch(0.96 0.02 80)" />
      <path d="M60,52 L62,58 L58,55 Z" fill="oklch(0.96 0.02 80)" />
      {/* huge body */}
      <path d="M20,60 Q55,52 90,60 L94,120 L82,172 L66,172 L60,130 L50,130 L44,172 L28,172 L16,120 Z"
        fill={skin} stroke="oklch(0.12 0.02 20)" strokeWidth="1.6" />
      {/* belt */}
      <rect x="18" y="100" width="74" height="9" fill="oklch(0.25 0.05 30)" />
      <rect x="50" y="98" width="10" height="13" fill={horns} />
      {/* kanabō club */}
      <line x1="20" y1="80" x2="-8" y2="30" stroke="oklch(0.30 0.03 40)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="-10" cy="28" r="14" fill="oklch(0.22 0.02 40)" stroke="oklch(0.4 0.04 40)" strokeWidth="1.5" />
      <circle cx="-14" cy="22" r="2" fill="oklch(0.5 0.05 40)" />
      <circle cx="-6" cy="32" r="2" fill="oklch(0.5 0.05 40)" />
      <circle cx="-12" cy="34" r="2" fill="oklch(0.5 0.05 40)" />
    </svg>
  );
}

function NinjaSvg({ tier }: { tier: number }) {
  const accent = `oklch(0.62 0.22 ${tier > 3 ? 80 : 25})`;
  const cloth = `oklch(0.08 0.005 260)`;
  return (
    <svg viewBox="0 0 100 180" className="h-full w-full -scale-x-100 overflow-visible">
      <ellipse cx="50" cy="178" rx="20" ry="3" fill="black" opacity="0.5" />
      {/* hood */}
      <path d="M36,40 Q50,22 64,40 L62,52 Q50,56 38,52 Z" fill={cloth} stroke={accent} strokeWidth="1.2" />
      {/* face strip */}
      <rect x="39" y="40" width="22" height="5" fill="oklch(0.78 0.05 60)" />
      <rect x="42" y="41" width="3" height="2.5" fill={accent} />
      <rect x="55" y="41" width="3" height="2.5" fill={accent} />
      {/* lithe body */}
      <path d="M34,54 Q50,48 66,54 L70,108 L62,150 L60,172 L54,172 L52,140 L48,140 L46,172 L40,172 L38,150 L30,108 Z"
        fill={cloth} stroke={accent} strokeWidth="1.2" />
      {/* belt */}
      <rect x="32" y="92" width="36" height="5" fill={accent} />
      {/* kunai */}
      <line x1="68" y1="70" x2="92" y2="46" stroke="oklch(0.30 0.02 260)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M92,46 L104,38 L96,52 Z" fill="oklch(0.95 0.02 260)" stroke={accent} strokeWidth="0.8" />
      {/* shuriken (spinning) */}
      <g transform="translate(20 70)" fill={accent}>
        <path d="M0,-6 L2,-2 L6,0 L2,2 L0,6 L-2,2 L-6,0 L-2,-2 Z" />
        <circle cx="0" cy="0" r="1.2" fill={cloth} />
      </g>
    </svg>
  );
}

function LevelMapScreen({
  maxUnlocked,
  onPick,
  onBack,
  onReset,
}: {
  maxUnlocked: number;
  onPick: (lv: number) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  const nodes = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto bg-background/95 px-6 py-10 text-center backdrop-blur-md">
      <h2 className="font-blade text-4xl uppercase tracking-[0.3em] text-primary">The Path</h2>
      <p className="mt-2 font-blade text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
        Cleared {Math.max(0, maxUnlocked - 1)} / {TOTAL_LEVELS} — Progress saved
      </p>

      <div className="relative mt-10 w-full max-w-3xl">
        {/* zig-zag path */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-primary/40"
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M40,40 Q200,40 240,140 T440,240 T240,340 T440,440 T240,540"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="6 8"
            fill="none"
          />
        </svg>
        <div className="relative grid grid-cols-5 gap-x-4 gap-y-6 sm:gap-x-6">
          {nodes.map((lv) => {
            const unlocked = lv <= maxUnlocked;
            const cleared = lv < maxUnlocked;
            return (
              <button
                key={lv}
                disabled={!unlocked}
                onClick={() => unlocked && onPick(lv)}
                className={`group relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 font-blade text-lg transition-all ${
                  cleared
                    ? "border-accent bg-accent/20 text-accent hover:scale-110"
                    : unlocked
                      ? "border-primary bg-primary/20 text-primary blade-glow hover:scale-110"
                      : "border-border bg-card/40 text-muted-foreground/50 cursor-not-allowed"
                }`}
                title={unlocked ? `Level ${lv}` : "Locked"}
              >
                {cleared ? "✓" : unlocked ? lv : "🔒"}
                <span className="absolute -bottom-5 text-[9px] uppercase tracking-widest text-muted-foreground">
                  Lv {lv}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 mb-6 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-md border-2 border-border bg-card/60 px-6 py-3 font-blade text-xs uppercase tracking-[0.35em] hover:bg-card"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all level progress?")) onReset();
          }}
          className="rounded-md border-2 border-destructive/60 bg-destructive/10 px-6 py-3 font-blade text-xs uppercase tracking-[0.35em] text-destructive hover:bg-destructive/20"
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}