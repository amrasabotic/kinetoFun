import { useEffect, useRef, useState, useCallback } from 'react';
import { useGestureTracking } from './useGestureTracking';
import { useMenuHand } from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import { initialGameState, updateGame, restartGame, CANVAS_W, CANVAS_H } from './gameLogic';
import type { GameState } from './gameLogic';
import {
  initAudio, playHorn, playCarPass, playPedPass,
  playPhaseChange, playStrike, playGameOver,
} from './audio';

type Screen = 'landing' | 'howtoplay' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  if (screen === 'landing')   return <LandingScreen onPlay={() => setScreen('game')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay') return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  return <GameScreen onQuit={() => setScreen('landing')} />;
}

// ── Dwell gesture navigation ──────────────────────────────────────────────────

const DWELL_MS  = 900;
const CURSOR_R  = 22;

function MenuGestureLayer({ children }: {
  children: (props: { activeId: string | null; dwellProgress: number }) => React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand     = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef  = useRef(hand);
  handRef.current = hand;

  const [activeId, setActiveId]         = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef  = useRef<number | null>(null);
  const activeIdRef    = useRef<string | null>(null);
  const rafRef         = useRef<number>(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; activeIdRef.current = null;
      rafRef.current = requestAnimationFrame(loop); return;
    }
    const cx = h.x * window.innerWidth, cy = h.y * window.innerHeight;
    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom)
        hoveredId = (el as HTMLElement).dataset.dwellId!;
    });
    if (hoveredId !== activeIdRef.current) {
      activeIdRef.current = hoveredId; setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null; setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const p = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(p);
      if (p >= 1) {
        (document.querySelector(`[data-dwell-id="${hoveredId}"]`) as HTMLElement | null)?.click();
        dwellStartRef.current = null; setActiveId(null); setDwellProgress(0); activeIdRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => { rafRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(rafRef.current); }, [loop]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
      {children({ activeId, dwellProgress })}
      {hand.detected && (
        <div className="pointer-events-none fixed z-40"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#f59e0b" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      <div className={`fixed top-3 left-3 z-40 w-2.5 h-2.5 rounded-full border border-black/30 ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
    </div>
  );
}

function GestureBtn({ dwellId, activeId, dwellProgress, onClick, className = '', children }: {
  dwellId: string; activeId: string | null; dwellProgress: number;
  onClick: () => void; className?: string; children: React.ReactNode;
}) {
  const isActive = activeId === dwellId;
  const circ = 2 * Math.PI * (CURSOR_R - 3);
  return (
    <div className="relative">
      <button data-dwell-id={dwellId} onClick={onClick}
        className={`${className} ${isActive ? 'ring-2 ring-amber-400/60' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#f59e0b" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

function GameGestureBtn({ dwellId, activeId, dwellProgress, onClick, className = '', children }: {
  dwellId: string; activeId: string | null; dwellProgress: number;
  onClick: () => void; className?: string; children: React.ReactNode;
}) {
  const isActive = activeId === dwellId;
  const R = 16;
  const circ = 2 * Math.PI * (R - 2);
  return (
    <div className="relative inline-flex">
      <button data-dwell-id={dwellId} onClick={onClick}
        className={`${className} ${isActive ? 'ring-2 ring-amber-400/70 brightness-125' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={R * 2} height={R * 2} className="absolute">
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="#f59e0b" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${R} ${R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <MenuGestureLayer>
      {({ activeId, dwellProgress }) => (
        <div className="h-screen bg-gradient-to-br from-gray-950 via-amber-950 to-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-7 w-full max-w-sm">
            {/* Mini intersection hero */}
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 bg-amber-950/60 rounded-full" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-10 bg-gray-700 rounded" />
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 bg-gray-700 rounded" />
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-800" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">🚦</div>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
                Traffic<br /><span className="text-amber-400">Controller</span>
              </h1>
              <p className="text-white/60 text-sm tracking-widest uppercase mt-1">Direct · Stop · Wave · Control</p>
            </div>
            <p className="text-white/40 text-xs text-center">Hover your hand over a button and hold still to select</p>
            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-amber-900/50">
                PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-base rounded-xl transition-all border border-white/20">
                How to Play
              </GestureBtn>
            </div>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── How To Play ───────────────────────────────────────────────────────────────

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const items = [
    { icon: '👉', title: 'Point Right → N-S Green', desc: 'Point your index finger to the RIGHT to open the North-South lane. Cars from the top and bottom will flow through the intersection.' },
    { icon: '👈', title: 'Point Left → E-W Green', desc: 'Point your index finger to the LEFT to open the East-West lane. Left and right traffic gets the green light.' },
    { icon: '👋', title: 'Wave → Pedestrians', desc: 'Wave your hand side-to-side to let pedestrians cross. All car lanes go red while people walk.' },
    { icon: '✋', title: 'Open Palm → All Stop', desc: 'Hold your open palm toward the camera to force all traffic to stop. Use to prevent a dangerous build-up.' },
    { icon: '😡', title: 'Angry Cars', desc: 'Cars left waiting too long (anger bar goes full) will run the red light — that\'s a strike. You have 3 strikes.' },
    { icon: '🚶', title: 'Pedestrian Warnings', desc: 'When pedestrians appear (yellow figure), wave before their patience runs out (12 seconds) or lose a strike.' },
    { icon: '⏱️', title: 'Auto-Reset', desc: 'Each green phase lasts up to 7 seconds, then resets to all-red. You must keep gesturing to manage the flow.' },
  ];
  return (
    <MenuGestureLayer>
      {({ activeId, dwellProgress }) => (
        <div className="h-screen bg-gradient-to-br from-gray-950 via-amber-950 to-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center drop-shadow">How to Play</h2>
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {items.map(item => (
                <div key={item.title} className="flex gap-3 bg-white/8 rounded-xl p-3 border border-white/10">
                  <div className="w-8 flex-shrink-0 flex items-start justify-center pt-0.5 text-xl">{item.icon}</div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.title}</p>
                    <p className="text-white/60 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/20">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function GameScreen({ onQuit }: { onQuit: () => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const stateRef   = useRef<GameState>(initialGameState());
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);
  const rafRef     = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameOverSoundedRef = useRef(false);

  const gesture    = useGestureTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const gestureRef = useRef(gesture);
  gestureRef.current = gesture;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  // Dwell for overlay/panel buttons
  const [dwellActiveId, setDwellActiveId]     = useState<string | null>(null);
  const [dwellProgress, setDwellProgress]       = useState(0);
  const dwellStartRef    = useRef<number | null>(null);
  const dwellActiveIdRef = useRef<string | null>(null);
  const dwellRafRef      = useRef<number>(0);

  const dwellLoop = useCallback((ts: number) => {
    const g = gestureRef.current;
    if (!g.detected) {
      setDwellActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; dwellActiveIdRef.current = null;
      dwellRafRef.current = requestAnimationFrame(dwellLoop); return;
    }
    const cx = g.x * window.innerWidth, cy = g.y * window.innerHeight;
    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom)
        hoveredId = (el as HTMLElement).dataset.dwellId!;
    });
    if (hoveredId !== dwellActiveIdRef.current) {
      dwellActiveIdRef.current = hoveredId; setDwellActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null; setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const p = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(p);
      if (p >= 1) {
        (document.querySelector(`[data-dwell-id="${hoveredId}"]`) as HTMLElement | null)?.click();
        dwellStartRef.current = null; setDwellActiveId(null); setDwellProgress(0); dwellActiveIdRef.current = null;
      }
    }
    dwellRafRef.current = requestAnimationFrame(dwellLoop);
  }, []);

  useEffect(() => {
    dwellRafRef.current = requestAnimationFrame(dwellLoop);
    return () => cancelAnimationFrame(dwellRafRef.current);
  }, [dwellLoop]);

  // Game loop
  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const gs = stateRef.current;
    if (gs.gamePhase !== 'gameover') {
      const { state: newState, events } = updateGame(gs, gestureRef.current, delta);
      stateRef.current = newState;
      setDisplayState({ ...newState });

      for (const ev of events) {
        if (ev.type === 'horn')         playHorn();
        if (ev.type === 'car-pass')     playCarPass();
        if (ev.type === 'ped-pass')     playPedPass();
        if (ev.type === 'phase-change') playPhaseChange();
        if (ev.type === 'strike')       playStrike();
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useEffect(() => {
    draw(displayState, gesture, videoRef.current);
  }, [displayState, gesture, draw]);

  useEffect(() => {
    if (displayState.gamePhase === 'gameover' && !gameOverSoundedRef.current) {
      gameOverSoundedRef.current = true;
      playGameOver();
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: Math.floor(displayState.score) }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.gamePhase]);

  const handleRestart = () => {
    gameOverSoundedRef.current = false;
    stateRef.current = restartGame(stateRef.current.highScore);
    setDisplayState({ ...stateRef.current });
  };

  const gs = displayState;
  const pedWaiting = gs.pedGroups.some(p => !p.crossing);

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-center gap-4 h-full py-4 px-4">

        {/* Left panel */}
        <div className="flex flex-col items-center justify-between gap-3 w-28 shrink-0 h-full py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🚦</span>
            <span className="text-amber-400/70 text-xs font-bold uppercase tracking-widest">Traffic</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Score</span>
            <span className="text-white font-black text-3xl tabular-nums">{Math.floor(gs.score)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Strikes</span>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className={`text-lg font-black ${i < gs.strikes ? 'text-red-500' : 'text-white/15'}`}>✕</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Best</span>
            <span className="text-yellow-400 font-black text-xl">{Math.floor(gs.highScore)}</span>
          </div>
          {/* Phase indicator */}
          <div className="w-full rounded-lg p-2 text-center text-xs font-bold"
            style={{
              background: gs.trafficPhase === 'ns-green' ? 'rgba(34,197,94,0.15)'
                : gs.trafficPhase === 'ew-green' ? 'rgba(59,130,246,0.15)'
                : gs.trafficPhase === 'ped'      ? 'rgba(234,179,8,0.15)'
                : 'rgba(255,255,255,0.05)',
              color: gs.trafficPhase === 'ns-green' ? '#4ade80'
                : gs.trafficPhase === 'ew-green' ? '#60a5fa'
                : gs.trafficPhase === 'ped'      ? '#fbbf24'
                : '#6b7280',
            }}>
            {gs.trafficPhase === 'ns-green' ? '↑↓ N-S' :
             gs.trafficPhase === 'ew-green' ? '←→ E-W' :
             gs.trafficPhase === 'ped'      ? '🚶 Peds' : '⬛ Stop'}
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-1.5 w-full">
            <GameGestureBtn dwellId="restart" activeId={dwellActiveId} dwellProgress={dwellProgress}
              onClick={handleRestart}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Restart
            </GameGestureBtn>
            <GameGestureBtn dwellId="quit-side" activeId={dwellActiveId} dwellProgress={dwellProgress}
              onClick={onQuit}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Quit
            </GameGestureBtn>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-shrink-0">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            className="rounded-xl shadow-2xl block" />

          {/* No hand overlay */}
          {!gesture.detected && gs.gamePhase === 'playing' && (
            <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
              <span className="text-5xl mb-3">✋</span>
              <p className="text-white font-bold text-lg">Show your hand!</p>
              <p className="text-white/50 text-sm mt-1">Point · Wave · Stop to direct traffic</p>
            </div>
          )}

          {/* Pedestrian warning */}
          {pedWaiting && gs.trafficPhase !== 'ped' && gs.gamePhase === 'playing' && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-black px-3 py-1 rounded-full animate-pulse">
              🚶 Pedestrians waiting — Wave!
            </div>
          )}

          {/* Game Over overlay */}
          {gs.gamePhase === 'gameover' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.84)', backdropFilter: 'blur(6px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                <p className="text-red-400 font-black text-4xl">Chaos! 🚨</p>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white font-black text-5xl tabular-nums">{Math.floor(gs.score)}</span>
                  <span className="text-white/40 text-xs uppercase tracking-widest">Final Score</span>
                  {Math.floor(gs.score) >= Math.floor(gs.highScore) && gs.score > 10 && (
                    <span className="text-yellow-400 font-bold text-sm mt-1">New High Score!</span>
                  )}
                </div>
                <p className="text-white/50 text-sm">Survived <span className="text-amber-400 font-bold">{Math.floor(gs.elapsed / 1000)}s</span></p>
                <div className="flex gap-3">
                  <GameGestureBtn dwellId="try-again" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={handleRestart}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black rounded-xl transition-all">
                    Try Again
                  </GameGestureBtn>
                  <GameGestureBtn dwellId="quit-lose" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={onQuit}
                    className="px-6 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
                    Quit
                  </GameGestureBtn>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center justify-between gap-3 w-36 shrink-0 h-full py-2">
          <div className="flex flex-col gap-2 w-full text-xs text-white/50 leading-relaxed">
            <p className="font-bold text-white/70 uppercase tracking-widest text-xs">Gestures</p>
            <p>👉 Point Right → N-S</p>
            <p>👈 Point Left → E-W</p>
            <p>👋 Wave → Peds</p>
            <p>✋ Palm → All Stop</p>
          </div>
          {/* Current gesture display */}
          <div className="w-full rounded-xl p-3 text-center border border-white/10 bg-white/5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Gesture</p>
            <span className="text-3xl">
              {!gesture.detected ? '—'
                : gesture.gesture === 'point-right' ? '👉'
                : gesture.gesture === 'point-left'  ? '👈'
                : gesture.gesture === 'wave'         ? '👋'
                : gesture.gesture === 'stop'         ? '✋'
                : '🤚'}
            </span>
            <p className="text-white/40 text-xs mt-1">
              {!gesture.detected ? 'No hand'
                : gesture.gesture === 'point-right' ? 'Point Right'
                : gesture.gesture === 'point-left'  ? 'Point Left'
                : gesture.gesture === 'wave'         ? 'Waving!'
                : gesture.gesture === 'stop'         ? 'All Stop'
                : 'Neutral'}
            </p>
          </div>
          <div className="flex-1" />
          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${gesture.detected ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>

      </div>

      {/* Floating wrist cursor */}
      {gesture.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: gesture.x * window.innerWidth - CURSOR_R, top: gesture.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#f59e0b" fillOpacity="0.85" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
