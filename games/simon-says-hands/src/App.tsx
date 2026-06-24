import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking } from './useHandTracking';
import { useMenuHand } from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import {
  initialGameState, updateGame, restartGame,
  CANVAS_W, CANVAS_H,
} from './gameLogic';
import type { GameState } from './gameLogic';
import { initAudio, playPanel, playCorrect, playWin, playFail, playSlap } from './audio';

type Screen = 'landing' | 'howtoplay' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  if (screen === 'landing')   return <LandingScreen onPlay={() => setScreen('game')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay') return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  return <GameScreen onQuit={() => setScreen('landing')} />;
}

// ── Dwell gesture navigation ──────────────────────────────────────────────────

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
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#6366f1" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
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
        className={`${className} ${isActive ? 'ring-2 ring-indigo-400/60' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#6366f1" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

// Gesture button for the game screen (uses hand wrist dwell)
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
        className={`${className} ${isActive ? 'ring-2 ring-indigo-400/70 brightness-125' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={R * 2} height={R * 2} className="absolute">
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx={R} cy={R} r={R - 2} fill="none" stroke="#6366f1" strokeWidth="3"
              strokeDasharray={`${circ * dwellProgress} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${R} ${R})`} />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

const PANEL_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];

function SimonHero() {
  return (
    <div className="grid grid-cols-2 gap-3 w-32 h-32">
      {PANEL_COLORS.map((c, i) => (
        <div key={i} className="rounded-xl" style={{ background: c, opacity: 0.85 }} />
      ))}
    </div>
  );
}

function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <MenuGestureLayer>
      {({ activeId, dwellProgress }) => (
        <div className="h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-7 w-full max-w-sm">
            <SimonHero />
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
                Simon Says<br /><span className="text-indigo-400">Hands</span>
              </h1>
              <p className="text-white/60 text-sm tracking-widest uppercase mt-1">Watch · Remember · Slap</p>
            </div>
            <p className="text-white/40 text-xs text-center">Hover your hand over a button and hold still to select</p>
            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-indigo-900/50">
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

// ── How To Play Screen ────────────────────────────────────────────────────────

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const items = [
    { icon: '👀', title: 'Watch the Sequence', desc: 'Panels light up one by one. Pay attention to the order — you\'ll need to repeat it exactly.' },
    { icon: '✋', title: 'Slap the Panel', desc: 'Swing your hand downward onto the correct colored panel. A sharp downward motion triggers the slap.' },
    { icon: '🔁', title: 'Growing Sequence', desc: 'Each round a new panel is added to the sequence. The sequence keeps growing until you make a mistake.' },
    { icon: '⚡', title: 'Speed Up', desc: 'Higher rounds flash faster. Stay focused as the tempo increases — the pattern moves quickly by round 8+.' },
    { icon: '🎯', title: 'Scoring', desc: 'Earn 50 × round points per correct slap, plus a 100 × round bonus for completing the full sequence.' },
    { icon: '❌', title: 'Game Over', desc: 'One wrong panel and it\'s over. Your final score is shown — try to beat your high score!' },
  ];

  return (
    <MenuGestureLayer>
      {({ activeId, dwellProgress }) => (
        <div className="h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const stateRef  = useRef<GameState>(initialGameState());
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);
  const rafRef     = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const hand = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef = useRef(hand);
  handRef.current = hand;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  // Dwell detection for overlay buttons
  const [dwellActiveId, setDwellActiveId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef    = useRef<number | null>(null);
  const dwellActiveIdRef = useRef<string | null>(null);
  const dwellRafRef      = useRef<number>(0);

  const dwellLoop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setDwellActiveId(null); setDwellProgress(0);
      dwellStartRef.current = null; dwellActiveIdRef.current = null;
      dwellRafRef.current = requestAnimationFrame(dwellLoop); return;
    }
    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;
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

  // Game loop
  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const gs = stateRef.current;
    if (gs.phase !== 'gameover') {
      const { state: newState, events } = updateGame(gs, handRef.current, delta);
      stateRef.current = newState;
      setDisplayState({ ...newState });

      for (const ev of events) {
        if (ev.type === 'panel')   playPanel(ev.index);
        if (ev.type === 'slap')    playSlap();
        if (ev.type === 'correct') playCorrect();
        if (ev.type === 'win')     playWin();
        if (ev.type === 'fail')    playFail();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // Redraw canvas every frame
  useEffect(() => {
    draw(displayState, videoRef.current, hand.x, hand.y, hand.detected);
  }, [displayState, hand, draw]);

  // Score submission on game over
  useEffect(() => {
    if (displayState.phase === 'gameover') {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: displayState.score }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.phase]);

  const handleRestart = () => {
    stateRef.current = restartGame(stateRef.current.highScore);
    setDisplayState({ ...stateRef.current });
  };

  const gs = displayState;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-center gap-4 h-full py-4 px-4">

        {/* Left panel */}
        <div className="flex flex-col items-center justify-between gap-4 w-28 shrink-0 h-full py-2">
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-2 gap-1 w-8 h-8 mb-1">
              {PANEL_COLORS.map((c, i) => (
                <div key={i} className="rounded-sm" style={{ background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span className="text-indigo-400/70 text-xs font-bold uppercase tracking-widest">Simon</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Score</span>
            <span className="text-white font-black text-3xl tabular-nums">{gs.score}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Round</span>
            <span className="text-indigo-400 font-black text-2xl">{gs.round}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Best</span>
            <span className="text-yellow-400 font-black text-xl">{gs.highScore}</span>
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
          {!hand.detected && gs.phase === 'input' && (
            <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
              <span className="text-5xl mb-3">✋</span>
              <p className="text-white font-bold text-lg">Show your hand!</p>
              <p className="text-white/50 text-sm mt-1">Move into frame to slap a panel</p>
            </div>
          )}

          {/* Game Over overlay */}
          {gs.phase === 'gameover' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                <p className="text-red-400 font-black text-4xl">Wrong Panel! 💥</p>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-white font-black text-5xl tabular-nums">{gs.score}</span>
                  <span className="text-white/40 text-xs uppercase tracking-widest">Final Score</span>
                  {gs.score >= gs.highScore && gs.score > 0 && (
                    <span className="text-yellow-400 font-bold text-sm mt-1">New High Score!</span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white/50 text-sm">Reached round <span className="text-indigo-400 font-bold">{gs.round}</span></span>
                  <span className="text-white/50 text-sm">Sequence length: <span className="text-indigo-400 font-bold">{gs.sequence.length}</span></span>
                </div>
                <div className="flex gap-3">
                  <GameGestureBtn dwellId="try-again" activeId={dwellActiveId} dwellProgress={dwellProgress}
                    onClick={handleRestart}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black rounded-xl transition-all">
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
            <p>👀 Watch panels light up</p>
            <p>✋ Swing hand DOWN</p>
            <p>🎯 Hit the right color</p>
            {gs.phase === 'demo' && (
              <p className="text-indigo-400 font-bold mt-2">Memorizing…</p>
            )}
            {gs.phase === 'input' && (
              <p className="text-green-400 font-bold mt-2">Your turn!</p>
            )}
            {gs.phase === 'success' && (
              <p className="text-yellow-400 font-bold mt-2">Correct!</p>
            )}
            {gs.phase === 'fail' && (
              <p className="text-red-400 font-bold mt-2">Wrong!</p>
            )}
          </div>

          {/* Sequence progress during input */}
          {gs.phase === 'input' && (
            <div className="w-full flex flex-col gap-1">
              <p className="text-white/40 text-xs text-center uppercase tracking-widest">Progress</p>
              <div className="flex gap-1 flex-wrap justify-center">
                {gs.sequence.map((panelId, i) => (
                  <div key={i} className="w-4 h-4 rounded-sm"
                    style={{
                      background: i < gs.inputStep ? PANEL_COLORS[panelId] : 'rgba(255,255,255,0.1)',
                      border: i === gs.inputStep ? `2px solid ${PANEL_COLORS[panelId]}` : '2px solid transparent',
                    }} />
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />
          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>

      </div>

      {/* Floating wrist cursor for dwell navigation */}
      {hand.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6} fill="#6366f1" fillOpacity="0.85" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
