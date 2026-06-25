import { useState, useRef, useCallback, useEffect } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useGestureTracking } from './useGestureTracking';
import { useGameCanvas } from './useGameCanvas';
import {
  GameState, initialGameState, restartGame, updateGame, shootBubble,
  CANVAS_W, CANVAS_H,
} from './gameLogic';
import { playShoot, playBounce, playPop, playLevelUp, playGameOver } from './audio';

// ─── Constants ────────────────────────────────────────────────────────────────
const DWELL_MS = 900;

// ─── useMenuGesture: wrist tracking + dwell — fully reactive ─────────────────
interface MenuGestureState {
  detected: boolean;
  x: number;
  y: number;
  activeId: string | null;
  dwellProgress: number;
}

function useMenuGesture(videoRef: React.RefObject<HTMLVideoElement>): MenuGestureState {
  const [state, setState] = useState<MenuGestureState>({
    detected: false, x: 0.5, y: 0.5, activeId: null, dwellProgress: 0,
  });

  const lmRef      = useRef<HandLandmarker | null>(null);
  const rafRef     = useRef<number>(0);
  const lastTRef   = useRef<number>(-1);
  const dwellRef   = useRef<{ id: string | null; start: number }>({ id: null, start: 0 });

  useEffect(() => {
    let cancelled = false;

    function detect() {
      const video = videoRef.current;
      const lm    = lmRef.current;
      if (!video || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      if (video.currentTime !== lastTRef.current) {
        lastTRef.current = video.currentTime;
        const res = lm.detectForVideo(video, performance.now());

        if (res.landmarks?.length > 0) {
          const wrist = res.landmarks[0][0] as { x: number; y: number };
          const hx = 1 - wrist.x;
          const hy = wrist.y;
          const cx = hx * window.innerWidth;
          const cy = hy * window.innerHeight;

          const el = document.elementFromPoint(cx, cy)?.closest('[data-dwell-id]') as HTMLElement | null;
          const id = el?.dataset.dwellId ?? null;
          const d  = dwellRef.current;

          if (id !== d.id) {
            d.id = id;
            d.start = performance.now();
            setState({ detected: true, x: hx, y: hy, activeId: id, dwellProgress: 0 });
          } else {
            const p = id ? Math.min((performance.now() - d.start) / DWELL_MS, 1) : 0;
            if (id && p >= 1) {
              d.id = null; d.start = 0;
              setState({ detected: true, x: hx, y: hy, activeId: null, dwellProgress: 0 });
              // Trigger click
              const btn = document.querySelector(`[data-dwell-id="${id}"]`) as HTMLButtonElement | null;
              btn?.click();
            } else {
              setState({ detected: true, x: hx, y: hy, activeId: id, dwellProgress: p });
            }
          }
        } else {
          dwellRef.current.id = null;
          setState({ detected: false, x: 0.5, y: 0.5, activeId: null, dwellProgress: 0 });
        }
      }
      rafRef.current = requestAnimationFrame(detect);
    }

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const hlm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      lmRef.current = hlm;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      const video = videoRef.current;
      if (video) { video.srcObject = stream; video.play(); }
      rafRef.current = requestAnimationFrame(detect);
    }

    init().catch(console.error);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const video = videoRef.current;
      if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      lmRef.current?.close();
    };
  }, [videoRef]);

  return state;
}

// ─── GestureBtn ───────────────────────────────────────────────────────────────
function GestureBtn({
  dwellId, activeId, dwellProgress, onClick, children, className = '',
}: {
  dwellId: string; activeId: string | null; dwellProgress: number;
  onClick: () => void; children: React.ReactNode; className?: string;
}) {
  const active = activeId === dwellId;
  const R = 18;
  const circ = 2 * Math.PI * (R - 2);
  return (
    <div className="relative inline-flex">
      <button
        data-dwell-id={dwellId}
        onClick={onClick}
        className={`${className} ${active ? 'ring-2 ring-violet-400/70 brightness-125' : ''} transition-all`}
      >
        {children}
      </button>
      {active && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={R * 2} height={R * 2} className="absolute">
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle
              cx={R} cy={R} r={R - 2} fill="none" stroke="#a78bfa" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${R} ${R})`}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── HandCursor ───────────────────────────────────────────────────────────────
function HandCursor({ x, y, detected }: { x: number; y: number; detected: boolean }) {
  if (!detected) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 w-5 h-5 rounded-full border-2 border-violet-400 bg-violet-400/20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x * window.innerWidth, top: y * window.innerHeight }}
    />
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────
type Screen = 'landing' | 'howto' | 'game';

function LandingScreen({
  onStart, onHowTo, videoRef,
}: {
  onStart: () => void; onHowTo: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const { detected, x, y, activeId, dwellProgress } = useMenuGesture(videoRef);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white overflow-hidden">
      <HandCursor x={x} y={y} detected={detected} />
      {/* Decorative bubbles */}
      {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'].map((c, i) => (
        <div key={i} className="absolute rounded-full opacity-20 animate-pulse"
          style={{
            width: 40 + i * 12, height: 40 + i * 12,
            background: c,
            top: `${10 + i * 13}%`,
            left: `${5 + i * 15}%`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      <div className="z-10 flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-5xl font-black text-violet-300 drop-shadow-lg">Bubble Shooter</h1>
          <p className="mt-2 text-slate-400 text-lg">Aim with your finger · Pinch to shoot · Match 3 to pop!</p>
        </div>
        <div className="flex flex-col gap-4 w-60">
          <GestureBtn
            dwellId="start" activeId={activeId} dwellProgress={dwellProgress}
            onClick={onStart}
            className="w-full px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-lg"
          >
            Play
          </GestureBtn>
          <GestureBtn
            dwellId="howto" activeId={activeId} dwellProgress={dwellProgress}
            onClick={onHowTo}
            className="w-full px-8 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-lg"
          >
            How to Play
          </GestureBtn>
        </div>
        <p className="text-slate-500 text-sm">Hover your hand over a button to select it</p>
      </div>
      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
}

function HowToScreen({
  onBack, onStart, videoRef,
}: {
  onBack: () => void; onStart: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const { detected, x, y, activeId, dwellProgress } = useMenuGesture(videoRef);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white">
      <HandCursor x={x} y={y} detected={detected} />
      <div className="z-10 max-w-lg text-center flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-violet-300">How to Play</h2>
        <div className="bg-slate-800/70 rounded-2xl p-6 text-left space-y-4 text-slate-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">☝️</span>
            <div><strong className="text-violet-300">Aim</strong> — point your index finger to aim the shooter. The dashed line shows the trajectory.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤌</span>
            <div><strong className="text-violet-300">Shoot</strong> — pinch your thumb and index finger together to launch a bubble.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔴</span>
            <div><strong className="text-violet-300">Match</strong> — pop 3 or more same-colored bubbles. Popping clusters drops floating bubbles too!</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⬆️</span>
            <div><strong className="text-violet-300">Survive</strong> — don't let bubbles reach the red danger line. Clear the board to advance levels.</div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <GestureBtn
            dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
            onClick={onBack}
            className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold"
          >
            Back
          </GestureBtn>
          <GestureBtn
            dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
            onClick={onStart}
            className="px-8 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold"
          >
            Let's Play!
          </GestureBtn>
        </div>
      </div>
      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────
function GameScreen({
  onQuit, initialHighScore,
}: {
  onQuit: () => void; initialHighScore: number;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const gsRef      = useRef<GameState>({ ...initialGameState(), highScore: initialHighScore });
  const lastTsRef  = useRef<number>(-1);
  const rafRef     = useRef<number>(0);

  const [aimAngle, setAimAngle]           = useState(Math.PI / 2);
  const [handX, setHandX]                 = useState(0.5);
  const [handY, setHandY]                 = useState(0.5);
  const [handDetected, setHandDetected]   = useState(false);
  const [phase, setPhase]                 = useState<string>('playing');
  const [dwellActiveId, setDwellActiveId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const aimRef          = useRef(Math.PI / 2);
  const flickPendingRef = useRef(false);
  const handXRef        = useRef(0.5);
  const handYRef        = useRef(0.5);
  const handDetRef      = useRef(false);

  const onFrame = useCallback((data: {
    detected: boolean; wristX: number; wristY: number; aimAngle: number; flick: boolean;
  }) => {
    setHandDetected(data.detected);
    setHandX(data.wristX);
    setHandY(data.wristY);
    handXRef.current   = data.wristX;
    handYRef.current   = data.wristY;
    handDetRef.current = data.detected;
    if (data.detected) {
      aimRef.current = data.aimAngle;
      setAimAngle(data.aimAngle);
      if (data.flick) flickPendingRef.current = true;
    }
  }, []);

  useGestureTracking(videoRef, onFrame);

  // Game loop
  useEffect(() => {
    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);
      if (lastTsRef.current < 0) { lastTsRef.current = ts; return; }
      const delta = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      let gs = gsRef.current;

      // Consume pinch-shoot
      if (flickPendingRef.current && gs.phase === 'playing' && !gs.flying) {
        flickPendingRef.current = false;
        const { state: s2, events: e2 } = shootBubble(gs, aimRef.current);
        gs = s2;
        for (const ev of e2) {
          if (ev.type === 'shoot') playShoot();
        }
      }

      const { state: s3, events: e3 } = updateGame(gs, delta);
      gs = s3;
      for (const ev of e3) {
        if (ev.type === 'bounce')   playBounce();
        if (ev.type === 'pop')      playPop(ev.count);
        if (ev.type === 'levelup')  playLevelUp();
        if (ev.type === 'gameover') playGameOver();
      }
      gsRef.current = gs;
      setPhase(gs.phase);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Dwell loop for game-screen overlay buttons (uses wrist position from gesture tracker)
  const dwellRef = useRef<{ id: string | null; start: number }>({ id: null, start: 0 });
  useEffect(() => {
    let rafId = 0;
    function loop() {
      rafId = requestAnimationFrame(loop);
      if (!handDetRef.current) {
        setDwellActiveId(null); setDwellProgress(0); dwellRef.current.id = null; return;
      }
      const cx = handXRef.current * window.innerWidth;
      const cy = handYRef.current * window.innerHeight;
      const el = document.elementFromPoint(cx, cy)?.closest('[data-dwell-id]') as HTMLElement | null;
      const id = el?.dataset.dwellId ?? null;
      const d  = dwellRef.current;
      if (id !== d.id) {
        d.id = id; d.start = performance.now();
        setDwellActiveId(id); setDwellProgress(0); return;
      }
      if (!id) return;
      const p = Math.min((performance.now() - d.start) / DWELL_MS, 1);
      setDwellProgress(p);
      if (p >= 1) {
        d.id = null; d.start = 0; setDwellActiveId(null); setDwellProgress(0);
        const btn = document.querySelector(`[data-dwell-id="${id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useGameCanvas(canvasRef, gsRef, aimAngle, handX, handY, handDetected, videoRef);

  const handleRestart = useCallback(() => {
    const hs = gsRef.current.highScore;
    gsRef.current = restartGame(hs);
    setPhase('playing');
    flickPendingRef.current = false;
    lastTsRef.current = -1;
  }, []);

  const handleQuit = useCallback(() => {
    const score = Math.floor(gsRef.current.score);
    window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    onQuit();
  }, [onQuit]);

  const isOver    = phase === 'gameover';
  const score     = Math.floor(gsRef.current.score);
  const highScore = Math.floor(gsRef.current.highScore);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
      <div className="relative" style={{ width: CANVAS_W, maxWidth: '100vw' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl shadow-2xl shadow-violet-900/40 block"
          style={{ width: '100%' }}
        />

        {/* Game Over overlay */}
        {isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-950/80 gap-6">
            <div className="text-center">
              <p className="text-4xl font-black text-red-400">Game Over</p>
              <p className="mt-1 text-xl text-slate-300">Score: <span className="text-violet-300 font-bold">{score}</span></p>
              {score >= highScore && score > 0 && (
                <p className="text-amber-400 font-bold">New Best!</p>
              )}
            </div>
            <div className="flex gap-4">
              <GestureBtn
                dwellId="restart" activeId={dwellActiveId} dwellProgress={dwellProgress}
                onClick={handleRestart}
                className="px-7 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold"
              >
                Play Again
              </GestureBtn>
              <GestureBtn
                dwellId="quit" activeId={dwellActiveId} dwellProgress={dwellProgress}
                onClick={handleQuit}
                className="px-7 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold"
              >
                Quit
              </GestureBtn>
            </div>
          </div>
        )}

        {/* Quit button (top right, always visible during play) */}
        {!isOver && (
          <GestureBtn
            dwellId="quit-side" activeId={dwellActiveId} dwellProgress={dwellProgress}
            onClick={handleQuit}
            className="absolute top-8 right-3 px-3 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium"
          >
            Quit
          </GestureBtn>
        )}

        {/* Gesture hint */}
        <div className="absolute bottom-2 right-3 text-xs text-slate-500 pointer-events-none select-none">
          {handDetected ? '☝️ point to aim · 🤌 pinch to shoot' : '✋ show hand to camera'}
        </div>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]   = useState<Screen>('landing');
  const [highScore, setHighScore] = useState(0);
  const menuVideoRef = useRef<HTMLVideoElement>(null);

  const handleStart = useCallback(() => setScreen('game'), []);
  const handleHowTo = useCallback(() => setScreen('howto'), []);
  const handleBack  = useCallback(() => setScreen('landing'), []);
  const handleQuit  = useCallback(() => {
    setHighScore(hs => Math.max(hs, 0));
    setScreen('landing');
  }, []);

  if (screen === 'landing') {
    return <LandingScreen onStart={handleStart} onHowTo={handleHowTo} videoRef={menuVideoRef} />;
  }
  if (screen === 'howto') {
    return <HowToScreen onBack={handleBack} onStart={handleStart} videoRef={menuVideoRef} />;
  }
  return <GameScreen onQuit={handleQuit} initialHighScore={highScore} />;
}
