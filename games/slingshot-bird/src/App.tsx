import { useEffect, useRef, useState, useCallback } from 'react';
import { usePinchTracking } from './usePinchTracking';
import { useMenuHand } from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import { initialGameState, updateGame, nextLevel, CANVAS_W, CANVAS_H } from './gameLogic';
import type { GameState } from './gameLogic';
import { initAudio, playLaunch, playHit, playBreak, playOink, playWin, playLose } from './audio';

type Screen = 'landing' | 'howtoplay' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  if (screen === 'landing')   return <LandingScreen onPlay={() => setScreen('game')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay') return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  return <GameScreen onQuit={() => setScreen('landing')} />;
}

// ── Dwell gesture navigation (same pattern as gesture-drums) ──────────────────

const DWELL_MS = 900;
const CURSOR_R = 22;

function MenuGestureLayer({ children }: { children: (props: {
  activeId: string | null;
  dwellProgress: number;
}) => React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef = useRef(hand);
  handRef.current = hand;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; activeIdRef.current = null;
      rafRef.current = requestAnimationFrame(loop); return;
    }
    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;
    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) hoveredId = id;
    });
    if (hoveredId !== activeIdRef.current) {
      activeIdRef.current = hoveredId;
      setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null;
      setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const progress = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(progress);
      if (progress >= 1) {
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
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#ef4444" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="1.5" />
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
        className={`${className} ${isActive ? 'ring-2 ring-red-400/60' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#ef4444" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

// Gesture button for the game screen — uses dwell state driven by pinch wrist position
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
        className={`${className} ${isActive ? 'ring-2 ring-red-400/70 brightness-125' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={R * 2} height={R * 2} className="absolute">
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="#ef4444" strokeWidth="3"
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
        <div className="h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-7 w-full max-w-sm">
            <SlingshotSvg />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
                Slingshot<span className="text-red-400">Bird</span>
              </h1>
              <p className="text-white/80 text-sm tracking-widest uppercase">Pinch · Pull · Launch · Destroy</p>
            </div>
            <p className="text-white/50 text-xs text-center">Hover your hand over a button and hold still to select</p>
            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-red-500 hover:bg-red-400 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-red-900/40">
                PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full py-3 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-semibold text-base rounded-xl transition-all border border-white/30">
                How to Play
              </GestureBtn>
            </div>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── How To Play Screen ────────────────────────────────────────────────────────

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const items = [
    { icon: '🤏', title: 'Pinch to Grab', desc: 'Bring your thumb tip and index finger tip together (pinch gesture) while your hand is near the bird in the slingshot. A dashed circle shows the grab zone.' },
    { icon: '⬅️', title: 'Pull Back', desc: 'While pinching, move your hand left and downward to pull the slingshot back. White dots show the predicted trajectory arc in real time.' },
    { icon: '✋', title: 'Release to Launch', desc: 'Open your fingers (release the pinch) to fire! The further you pulled, the faster the bird flies. Aim for the pigs!' },
    { icon: '🐷', title: 'Destroy the Pigs', desc: 'Hit green pigs directly to kill them (+500 pts each). Break surrounding blocks for bonus points. Smash everything to clear the level!' },
    { icon: '🧱', title: 'Block Types', desc: 'Glass (blue, easy), Wood (brown, medium), Stone (grey, hard — needs a powerful hit). Stone blocks take two hits to break.' },
    { icon: '⭐', title: 'Bonus Birds', desc: 'Each bird left unused after clearing a level gives you +1000 bonus points. Use fewer birds for a higher score!' },
    { icon: '🔄', title: 'Levels', desc: '4 unique levels of increasing difficulty. Complete all 4 and the game loops back — try to beat your score!' },
  ];

  return (
    <MenuGestureLayer>
      {({ activeId, dwellProgress }) => (
        <div className="h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center drop-shadow">How to Play</h2>
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {items.map(item => (
                <div key={item.title} className="flex gap-3 bg-white/20 rounded-xl p-3 border border-white/20">
                  <div className="w-8 flex-shrink-0 flex items-start justify-center pt-0.5 text-xl">{item.icon}</div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.title}</p>
                    <p className="text-white/70 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/30">
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<GameState>(initialGameState(0));
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const winSoundedRef = useRef(false);
  const loseSoundedRef = useRef(false);

  const pinch = usePinchTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const pinchRef = useRef(pinch);
  pinchRef.current = pinch;

  // Dwell detection for overlay / side-panel buttons
  const [dwellActiveId, setDwellActiveId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef = useRef<number | null>(null);
  const dwellActiveIdRef = useRef<string | null>(null);
  const dwellRafRef = useRef<number>(0);

  const dwellLoop = useCallback((ts: number) => {
    const p = pinchRef.current;
    if (!p.detected) {
      setDwellActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; dwellActiveIdRef.current = null;
      dwellRafRef.current = requestAnimationFrame(dwellLoop); return;
    }
    const cx = p.wristX * window.innerWidth;
    const cy = p.wristY * window.innerHeight;
    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) hoveredId = id;
    });
    if (hoveredId !== dwellActiveIdRef.current) {
      dwellActiveIdRef.current = hoveredId;
      setDwellActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null;
      setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const progress = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(progress);
      if (progress >= 1) {
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

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const gs = stateRef.current;
    if (gs.phase !== 'levelComplete' && gs.phase !== 'gameOver') {
      const { state: newState, events } = updateGame(gs, pinchRef.current, delta);
      stateRef.current = newState;
      setDisplayState({ ...newState });

      // Fire audio events
      for (const ev of events) {
        if (ev.type === 'launch') playLaunch();
        else if (ev.type === 'hit') playHit();
        else if (ev.type === 'break') playBreak();
        else if (ev.type === 'oink') playOink();
        else if (ev.type === 'win' && !winSoundedRef.current) { playWin(); winSoundedRef.current = true; }
        else if (ev.type === 'lose' && !loseSoundedRef.current) { playLose(); loseSoundedRef.current = true; }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // Redraw on every state update
  useEffect(() => {
    draw(displayState, videoRef.current, pinch.x, pinch.y, pinch.detected);
  }, [displayState, pinch, draw]);

  // Score submission on game over
  useEffect(() => {
    if (displayState.phase === 'gameOver') {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: displayState.score }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.phase]);

  const handleNextLevel = () => {
    winSoundedRef.current = false;
    stateRef.current = nextLevel(stateRef.current);
    setDisplayState({ ...stateRef.current });
  };

  const handleRestart = () => {
    winSoundedRef.current = false;
    loseSoundedRef.current = false;
    stateRef.current = initialGameState(0);
    setDisplayState({ ...stateRef.current });
  };

  const gs = displayState;
  const pigCount = gs.entities.filter(e => e.type === 'pig' && !e.dead).length;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-center gap-4 h-full py-4 px-4" style={{ maxHeight: CANVAS_H + 32 }}>

        {/* Left panel */}
        <div className="flex flex-col items-center justify-between gap-4 w-28 shrink-0 h-full py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">🐦</span>
            <span className="text-red-400/60 text-xs font-bold uppercase tracking-widest">Slingshot</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Score</span>
            <span className="text-white font-black text-3xl tabular-nums">{gs.score}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Level</span>
            <span className="text-yellow-400 font-black text-2xl">{(gs.level % 4) + 1}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Pigs</span>
            <span className="text-green-400 font-black text-2xl">{pigCount}🐷</span>
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
            className="rounded-xl shadow-2xl block h-full w-auto" style={{ maxHeight: CANVAS_H }} />

          {/* No hand overlay */}
          {!pinch.detected && (gs.phase === 'aiming' || gs.phase === 'pulling') && (
            <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
              <span className="text-5xl mb-3">🤏</span>
              <p className="text-white font-bold text-lg">Show your hand!</p>
              <p className="text-white/50 text-sm mt-1">Pinch near the bird to grab it</p>
            </div>
          )}

          {/* Level complete overlay */}
          {gs.phase === 'levelComplete' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                <p className="text-yellow-400 font-black text-4xl">Level Clear! 🎉</p>
                <div className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-white font-black text-3xl">{gs.score}</span>
                    <span className="text-white/40 text-xs uppercase tracking-widest">Score</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-green-400 font-black text-3xl">+{gs.birdsLeft * 1000}</span>
                    <span className="text-white/40 text-xs uppercase tracking-widest">Bird bonus</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <GameGestureBtn dwellId="next-level" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={handleNextLevel}
                    className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black rounded-xl transition-all">
                    Next Level →
                  </GameGestureBtn>
                  <GameGestureBtn dwellId="quit-win" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={onQuit}
                    className="px-6 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
                    Quit
                  </GameGestureBtn>
                </div>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gs.phase === 'gameOver' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                <p className="text-red-400 font-black text-4xl">Out of Birds! 😢</p>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white font-black text-5xl tabular-nums">{gs.score}</span>
                  <span className="text-white/40 text-xs uppercase tracking-widest">Final Score</span>
                </div>
                <div className="flex gap-3">
                  <GameGestureBtn dwellId="try-again" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={handleRestart}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-400 active:scale-95 text-white font-black rounded-xl transition-all">
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

        {/* Right panel: webcam + tips */}
        <div className="flex flex-col items-center justify-between gap-3 w-36 shrink-0 h-full py-2">
          <div className="flex flex-col gap-2 w-full text-xs text-white/50 leading-relaxed">
            <p className="font-bold text-white/70 uppercase tracking-widest text-xs">Controls</p>
            <p>🤏 Pinch near bird</p>
            <p>⬅️ Pull back</p>
            <p>✋ Release to launch</p>
          </div>
          <div className="flex-1" />
          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${pinch.detected ? 'bg-green-400' : 'bg-red-500'}`} />
            {pinch.pinching && pinch.detected && (
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
                <span className="bg-red-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">PINCHING</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating wrist cursor for dwell navigation */}
      {pinch.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: pinch.wristX * window.innerWidth - CURSOR_R, top: pinch.wristY * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#ef4444" fillOpacity="0.85" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── SVG decorations ───────────────────────────────────────────────────────────

function SlingshotSvg() {
  return (
    <svg width="120" height="110" viewBox="0 0 120 110" fill="none">
      {/* Sling stem */}
      <line x1="60" y1="105" x2="60" y2="65" stroke="#5D3A1A" strokeWidth="8" strokeLinecap="round"/>
      {/* Fork left */}
      <line x1="60" y1="65" x2="35" y2="30" stroke="#5D3A1A" strokeWidth="8" strokeLinecap="round"/>
      {/* Fork right */}
      <line x1="60" y1="65" x2="85" y2="30" stroke="#5D3A1A" strokeWidth="8" strokeLinecap="round"/>
      {/* Fork tips */}
      <circle cx="35" cy="30" r="5" fill="#3E2200"/>
      <circle cx="85" cy="30" r="5" fill="#3E2200"/>
      {/* Elastic bands */}
      <line x1="35" y1="30" x2="60" y2="55" stroke="#7B4F2E" strokeWidth="3" strokeLinecap="round"/>
      <line x1="85" y1="30" x2="60" y2="55" stroke="#7B4F2E" strokeWidth="3" strokeLinecap="round"/>
      {/* Bird */}
      <circle cx="60" cy="55" r="16" fill="#ef4444" stroke="#b91c1c" strokeWidth="2"/>
      {/* Bird eye */}
      <ellipse cx="65" cy="52" rx="5" ry="4" fill="white"/>
      <circle cx="66" cy="53" r="2.2" fill="#111"/>
      {/* Bird beak */}
      <path d="M 71 55 L 78 53 L 78 57 Z" fill="#f59e0b"/>
      {/* Brow */}
      <line x1="60" y1="46" x2="70" y2="49" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round"/>
      {/* Tuft */}
      <path d="M 58 40 L 62 46 L 66 40 L 62 48 Z" fill="#dc2626"/>
    </svg>
  );
}
