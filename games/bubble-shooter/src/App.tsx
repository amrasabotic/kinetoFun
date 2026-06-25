import { useState, useRef, useCallback, useEffect } from 'react';
import { useGestureTracking, useMenuHand, MenuHandData } from './useGestureTracking';
import { useGameCanvas } from './useGameCanvas';
import {
  GameState, initialGameState, restartGame, updateGame, shootBubble,
  CANVAS_W, CANVAS_H,
} from './gameLogic';
import { playShoot, playBounce, playPop, playLevelUp, playGameOver } from './audio';

// ─── Dwell button ─────────────────────────────────────────────────────────────
const DWELL_MS = 900;

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

// ─── Menu gesture layer (hover + dwell) ───────────────────────────────────────
function MenuGestureLayer({
  videoRef, onAction,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  onAction: (id: string) => void;
}) {
  const [, handRef] = useMenuHand(videoRef);
  const dwellRef = useRef<{ id: string | null; start: number }>({ id: null, start: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop);
    const hand = handRef.current as MenuHandData;
    if (!hand.detected) { setActiveId(null); setProgress(0); dwellRef.current.id = null; return; }
    const cx = hand.x * window.innerWidth;
    const cy = hand.y * window.innerHeight;
    const el = document.elementFromPoint(cx, cy)?.closest('[data-dwell-id]') as HTMLElement | null;
    const id = el?.dataset.dwellId ?? null;
    const d  = dwellRef.current;
    if (id !== d.id) { d.id = id; d.start = performance.now(); setActiveId(id); setProgress(0); return; }
    if (!id) return;
    const p = Math.min((performance.now() - d.start) / DWELL_MS, 1);
    setProgress(p);
    if (p >= 1) { d.id = null; d.start = 0; setActiveId(null); setProgress(0); onAction(id); }
  }, [handRef, onAction]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <>
      {/* Hand cursor overlay */}
      <div className="pointer-events-none fixed inset-0 z-50">
        {(handRef.current as MenuHandData).detected && (
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-violet-400 bg-violet-400/20"
            style={{
              left: (handRef.current as MenuHandData).x * window.innerWidth - 10,
              top:  (handRef.current as MenuHandData).y * window.innerHeight - 10,
            }}
          />
        )}
      </div>
      {/* Pass active state down via context substitute: expose for GestureBtn via DOM */}
      <style>{`[data-active-dwell="${activeId}"] { outline: 2px solid #a78bfa; }`}</style>
      {/* Hidden state exporters */}
      <_DwellState activeId={activeId} progress={progress} />
    </>
  );
}

// Tiny helper to make activeId/progress accessible via a React ref from parent
function _DwellState({ activeId, progress }: { activeId: string | null; progress: number }) {
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__dwellActiveId = activeId;
    (window as unknown as Record<string, unknown>).__dwellProgress = progress;
  }, [activeId, progress]);
  return null;
}

// ─── Screens ──────────────────────────────────────────────────────────────────
type Screen = 'landing' | 'howto' | 'game';

function LandingScreen({
  onStart, onHowTo, videoRef,
}: {
  onStart: () => void; onHowTo: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleAction = useCallback((id: string) => {
    if (id === 'start') onStart();
    if (id === 'howto') onHowTo();
  }, [onStart, onHowTo]);

  // Sync from MenuGestureLayer via window hack
  useEffect(() => {
    const id = setInterval(() => {
      setActiveId((window as unknown as Record<string, unknown>).__dwellActiveId as string | null ?? null);
      setProgress((window as unknown as Record<string, unknown>).__dwellProgress as number ?? 0);
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white overflow-hidden">
      <MenuGestureLayer videoRef={videoRef} onAction={handleAction} />
      {/* Decorative bubbles */}
      {['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#06b6d4'].map((c, i) => (
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
          <p className="mt-2 text-slate-400 text-lg">Aim with your finger · Flick to shoot · Match 3 to pop!</p>
        </div>
        <div className="flex flex-col gap-4 w-60">
          <GestureBtn
            dwellId="start" activeId={activeId} dwellProgress={progress}
            onClick={onStart}
            className="w-full px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-lg"
          >
            Play
          </GestureBtn>
          <GestureBtn
            dwellId="howto" activeId={activeId} dwellProgress={progress}
            onClick={onHowTo}
            className="w-full px-8 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-lg"
          >
            How to Play
          </GestureBtn>
        </div>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleAction = useCallback((id: string) => {
    if (id === 'back') onBack();
    if (id === 'play') onStart();
  }, [onBack, onStart]);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveId((window as unknown as Record<string, unknown>).__dwellActiveId as string | null ?? null);
      setProgress((window as unknown as Record<string, unknown>).__dwellProgress as number ?? 0);
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white">
      <MenuGestureLayer videoRef={videoRef} onAction={handleAction} />
      <div className="z-10 max-w-lg text-center flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-violet-300">How to Play</h2>
        <div className="bg-slate-800/70 rounded-2xl p-6 text-left space-y-4 text-slate-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">☝️</span>
            <div><strong className="text-violet-300">Aim</strong> — point your index finger to aim the shooter. The dashed line shows the trajectory.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤙</span>
            <div><strong className="text-violet-300">Shoot</strong> — flick your wrist upward quickly to launch a bubble.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔴</span>
            <div><strong className="text-violet-300">Match</strong> — pop 3 or more same-colored bubbles in a row. Popping clusters drops floating bubbles too!</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⬆️</span>
            <div><strong className="text-violet-300">Survive</strong> — don't let bubbles reach the red danger line. Clear the board to advance levels.</div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <GestureBtn
            dwellId="back" activeId={activeId} dwellProgress={progress}
            onClick={onBack}
            className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold"
          >
            Back
          </GestureBtn>
          <GestureBtn
            dwellId="play" activeId={activeId} dwellProgress={progress}
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

  const [aimAngle, setAimAngle]         = useState(Math.PI / 2);
  const [handX, setHandX]               = useState(0.5);
  const [handY, setHandY]               = useState(0.5);
  const [handDetected, setHandDetected] = useState(false);
  const [phase, setPhase]               = useState<string>('playing');
  const [dwellActiveId, setDwellActiveId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const aimRef = useRef(Math.PI / 2);
  const flickPendingRef = useRef(false);

  const onFrame = useCallback((data: {
    detected: boolean; wristX: number; wristY: number; aimAngle: number; flick: boolean;
  }) => {
    setHandDetected(data.detected);
    setHandX(data.wristX);
    setHandY(data.wristY);
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

      // Consume flick
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
        if (ev.type === 'bounce')  playBounce();
        if (ev.type === 'pop')     playPop(ev.count);
        if (ev.type === 'levelup') playLevelUp();
        if (ev.type === 'gameover') playGameOver();
      }
      gsRef.current = gs;
      setPhase(gs.phase);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Dwell loop for game-screen buttons
  const dwellHandRef = useRef<{ x: number; y: number; detected: boolean }>({ x: 0.5, y: 0.5, detected: false });
  useEffect(() => {
    dwellHandRef.current = { x: handX, y: handY, detected: handDetected };
  }, [handX, handY, handDetected]);

  const dwellRef = useRef<{ id: string | null; start: number }>({ id: null, start: 0 });
  useEffect(() => {
    let rafId = 0;
    function loop() {
      rafId = requestAnimationFrame(loop);
      const hand = dwellHandRef.current;
      if (!hand.detected) { setDwellActiveId(null); setDwellProgress(0); dwellRef.current.id = null; return; }
      const cx = hand.x * window.innerWidth;
      const cy = hand.y * window.innerHeight;
      const el = document.elementFromPoint(cx, cy)?.closest('[data-dwell-id]') as HTMLElement | null;
      const id = el?.dataset.dwellId ?? null;
      const d = dwellRef.current;
      if (id !== d.id) { d.id = id; d.start = performance.now(); setDwellActiveId(id); setDwellProgress(0); return; }
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

  const isOver   = phase === 'gameover';
  const score    = Math.floor(gsRef.current.score);
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

        {/* Quit button (top right, always visible) */}
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
          {handDetected ? '☝️ aim · 🤙 flick to shoot' : '✋ show hand to camera'}
        </div>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [highScore, setHighScore] = useState(0);
  const menuVideoRef = useRef<HTMLVideoElement>(null);

  const handleStart = useCallback(() => setScreen('game'), []);
  const handleHowTo = useCallback(() => setScreen('howto'), []);
  const handleBack  = useCallback(() => setScreen('landing'), []);
  const handleQuit  = useCallback(() => {
    // Preserve high score across sessions within this window
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
