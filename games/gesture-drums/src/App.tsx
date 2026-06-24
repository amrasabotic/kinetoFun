import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking } from './useHandTracking';
import { useMenuHand } from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import {
  initialGameState, stepGame, scoreHit, checkPadHit, accuracy,
  CANVAS_W, CANVAS_H,
} from './gameLogic';
import type { GameState, GameMode } from './gameLogic';
import { playDrum, initAudio } from './audio';

type Screen = 'landing' | 'howtoplay' | 'modeselect' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<GameMode>('freeplay');

  if (screen === 'landing')    return <LandingScreen onPlay={() => setScreen('modeselect')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay')  return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  if (screen === 'modeselect') return <ModeSelectScreen onSelect={m => { setMode(m); setScreen('game'); }} onBack={() => setScreen('landing')} />;
  return <GameScreen mode={mode} onQuit={() => setScreen('landing')} />;
}

// ── Dwell-to-click button ─────────────────────────────────────────────────────

const DWELL_MS = 900;
const CURSOR_R = 22; // cursor radius in px



// ── Menu gesture layer ────────────────────────────────────────────────────────
// Wraps a menu screen; provides hand tracking, cursor dot, and dwell detection.

function MenuGestureLayer({ children }: { children: (props: {
  hand: MenuHandData;
  activeId: string | null;
  dwellProgress: number;
  registerButton: (id: string, el: HTMLElement | null) => void;
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
  const buttonMapRef = useRef<Map<string, DOMRect>>(new Map());

  // Called by the screen to register button elements
  const registerButton = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      buttonMapRef.current.set(id, el.getBoundingClientRect());
    } else {
      buttonMapRef.current.delete(id);
    }
  }, []);

  // Dwell loop
  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActiveId(null);
      setDwellProgress(0);
      dwellStartRef.current = null;
      activeIdRef.current = null;
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;

    // Find which button the cursor is over
    let hoveredId: string | null = null;
    // Refresh rects each frame to handle layout shifts
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        hoveredId = id;
      }
    });

    if (hoveredId !== activeIdRef.current) {
      // Moved to a different target — reset dwell
      activeIdRef.current = hoveredId;
      setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null;
      setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const elapsed = ts - dwellStartRef.current;
      const progress = Math.min(elapsed / DWELL_MS, 1);
      setDwellProgress(progress);

      if (progress >= 1) {
        // Trigger the button
        const el = document.querySelector(`[data-dwell-id="${hoveredId}"]`) as HTMLElement | null;
        if (el) el.click();
        // Reset to prevent repeated fires
        dwellStartRef.current = null;
        setActiveId(null);
        setDwellProgress(0);
        activeIdRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <div className="relative w-full h-full">
      {/* Hidden video for hand tracking */}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {children({ hand, activeId, dwellProgress, registerButton })}

      {/* Floating cursor dot */}
      {hand.detected && (
        <div
          className="pointer-events-none fixed z-40"
          style={{
            left: hand.x * window.innerWidth - CURSOR_R,
            top: hand.y * window.innerHeight - CURSOR_R,
            width: CURSOR_R * 2,
            height: CURSOR_R * 2,
          }}
        >
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6}
              fill="#a855f7" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1}
              fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Hand status badge */}
      <div className={`fixed top-3 left-3 z-40 w-2.5 h-2.5 rounded-full border border-black/30 ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
    </div>
  );
}

// ── Helper: dwell-aware button used in menu screens ───────────────────────────
// Wraps a regular button; highlights when the dwell cursor is over it.

function GestureBtn({
  dwellId,
  activeId,
  dwellProgress,
  onClick,
  className = '',
  children,
}: {
  dwellId: string;
  activeId: string | null;
  dwellProgress: number;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = activeId === dwellId;
  const circumference = 2 * Math.PI * (CURSOR_R - 3);
  const dash = circumference * (isActive ? dwellProgress : 0);

  return (
    <div className="relative">
      <button
        data-dwell-id={dwellId}
        onClick={onClick}
        className={`${className} ${isActive ? 'ring-2 ring-purple-400/60' : ''} transition-all`}
      >
        {children}
      </button>
      {/* Progress ring rendered at button centre */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none"
              stroke="#a855f7" strokeWidth="3"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`}
            />
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
      {({ hand: _hand, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-8 w-full max-w-sm">
            <DrumKitSvg />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-black tracking-tight text-white">
                Gesture<span className="text-purple-400">Drums</span>
              </h1>
              <p className="text-gray-400 text-sm tracking-widest uppercase">Air-drum with your hands</p>
            </div>
            <p className="text-white/30 text-xs text-center">Hover your hand over a button and hold still to select it</p>
            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all duration-150 shadow-lg shadow-purple-900/50">
                PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold text-base rounded-xl tracking-wide transition-all duration-150 border border-white/10">
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
    {
      icon: '📷',
      title: 'Camera Setup',
      desc: 'Sit facing your webcam with both hands clearly visible. Keep your hands roughly at chest height, about 30–60 cm from the camera. Good lighting helps detection.',
    },
    {
      icon: '👈',
      title: 'Left Hand → Left Side',
      desc: 'Your LEFT hand controls the LEFT half of the screen: Hi-Hat (top-left, cyan), Crash (top-right, yellow), Snare (bottom-left, red), Rim Shot (bottom-right, orange).',
    },
    {
      icon: '👉',
      title: 'Right Hand → Right Side',
      desc: 'Your RIGHT hand controls the RIGHT half of the screen: Kick (top-left, purple), Tom (top-right, blue), Floor Tom (bottom-left, green), Cowbell (bottom-right, pink).',
    },
    {
      icon: '⬇️',
      title: 'How to Hit a Pad',
      desc: 'Move your hand DOWN quickly over a pad zone — like actually striking a drum. A slow hover does nothing; you need a fast downward strike motion. Each pad flashes and plays a sound when hit.',
    },
    {
      icon: '🎵',
      title: 'Rhythm Mode — How to Score',
      desc: 'Colored bars fall from the top toward each pad. When a bar reaches the glowing white hit line near the bottom, strike that pad. The closer to the line you hit, the more points you earn.',
    },
    {
      icon: '⭐',
      title: 'Timing Windows & Combo',
      desc: 'PERFECT (bar is right on the line) = 100 pts × combo multiplier. GOOD (slightly early/late) = 50 pts × combo. Missing a note resets your combo to zero. Build long combos for massive scores.',
    },
    {
      icon: '🥁',
      title: 'Free Play Mode',
      desc: 'No falling bars, no timing pressure — just hit any pad to hear it. Use this to learn where each pad is and practice your striking motion before jumping into Rhythm mode.',
    },
  ];

  return (
    <MenuGestureLayer>
      {({ hand: _hand, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-5">
            <h2 className="text-3xl font-black text-white text-center">How to Play</h2>
            <div className="flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {items.map(item => (
                <div key={item.title} className="flex gap-4 bg-white/5 rounded-xl p-3.5 border border-white/8">
                  <div className="w-8 flex-shrink-0 flex items-start justify-center pt-0.5 text-xl">{item.icon}</div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Mode Select Screen ────────────────────────────────────────────────────────

const MODE_OPTIONS: { id: GameMode; label: string; desc: string; accent: string; btn: string; bpm?: string }[] = [
  { id: 'freeplay', label: 'Free Play', desc: 'No timing, no score — just drum', accent: 'text-gray-300',   btn: 'bg-gray-700 hover:bg-gray-600' },
  { id: 'easy',     label: 'Easy',      desc: '80 BPM · basic kick & snare',     accent: 'text-green-400',  btn: 'bg-green-800 hover:bg-green-700', bpm: '80 BPM' },
  { id: 'medium',   label: 'Medium',    desc: '110 BPM · adds toms & 8th hats',  accent: 'text-yellow-400', btn: 'bg-yellow-800 hover:bg-yellow-700', bpm: '110 BPM' },
  { id: 'hard',     label: 'Hard',      desc: '140 BPM · syncopation & fills',   accent: 'text-red-400',    btn: 'bg-red-900 hover:bg-red-800', bpm: '140 BPM' },
];

function ModeSelectScreen({ onSelect, onBack }: { onSelect: (m: GameMode) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _hand, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center">Select Mode</h2>

            {/* Quick reminder */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/55 leading-relaxed">
              <span className="text-purple-400 font-bold">Rhythm modes:</span> colored bars fall toward each pad — strike the pad when the bar hits the glowing white line to score. <span className="text-yellow-400 font-bold">PERFECT</span> = 100 pts × combo · <span className="text-green-400 font-bold">GOOD</span> = 50 pts × combo.
            </div>

            <div className="flex flex-col gap-2.5">
              {MODE_OPTIONS.map(opt => (
                <GestureBtn key={opt.id} dwellId={`mode-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                  onClick={() => onSelect(opt.id)}
                  className={`w-full py-3.5 ${opt.btn} active:scale-95 text-white rounded-xl transition-all duration-150 shadow-lg flex items-center justify-between px-5`}>
                  <div className="flex flex-col items-start">
                    <span className={`font-black text-lg ${opt.accent}`}>{opt.label}</span>
                    <span className="text-white/50 text-xs">{opt.desc}</span>
                  </div>
                  {opt.bpm && <span className="text-white/40 text-sm font-mono">{opt.bpm}</span>}
                </GestureBtn>
              ))}
            </div>
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function GameScreen({ mode, onQuit }: { mode: GameMode; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameStateRef = useRef<GameState>(initialGameState(mode));
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const handsData = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsDataRef = useRef(handsData);
  handsDataRef.current = handsData;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const hands = handsDataRef.current;
    let gs = gameStateRef.current;
    if (gs.phase === 'playing') {
      gs = stepGame(gs, delta, ts);

      for (const pad of gs.pads) {
        const hand = pad.hand === 'left' ? hands.left : hands.right;
        if (!hand) continue;
        if (checkPadHit(pad, hand.x, hand.y, hand.vy, ts)) {
          playDrum(pad.sound);
          gs = scoreHit(gs, pad.id, ts);
        }
      }

      gameStateRef.current = gs;
      setDisplayState({ ...gs });
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useEffect(() => {
    const hands = handsDataRef.current;
    draw({
      state: displayState,
      leftDetected: !!hands.left,
      rightDetected: !!hands.right,
      leftX: hands.left?.x ?? 0.25,
      leftY: hands.left?.y ?? 0.5,
      rightX: hands.right?.x ?? 0.75,
      rightY: hands.right?.y ?? 0.5,
      videoEl: videoRef.current,
    });
  }, [displayState, draw]);

  useEffect(() => {
    if (displayState.phase === 'finished') {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: displayState.score }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.phase]);

  const handleRestart = () => {
    gameStateRef.current = initialGameState(mode);
    setDisplayState(gameStateRef.current);
  };

  const gs = displayState;
  const anyHand = !!handsData.left || !!handsData.right;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-stretch gap-4 h-full py-4 px-4" style={{ maxHeight: CANVAS_H + 32 }}>

        {/* ── Left panel ── */}
        <div className="flex flex-col items-center justify-between gap-3 w-28 shrink-0">
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="text-2xl">🥁</span>
            <span className="text-purple-400/60 text-xs font-bold uppercase tracking-widest">Drums</span>
          </div>

          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-white/40 text-xs uppercase tracking-widest">Score</span>
            <span className="text-white font-black text-3xl tabular-nums">{gs.score}</span>
          </div>

          {gs.combo > 1 && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-yellow-400/50 text-xs uppercase tracking-widest">Combo</span>
              <span className="text-yellow-400 font-black text-2xl">×{gs.combo}</span>
            </div>
          )}

          {gs.mode !== 'freeplay' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/40 text-xs uppercase tracking-widest">Accuracy</span>
              <span className="text-purple-400 font-black text-xl">{accuracy(gs)}%</span>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex flex-col gap-1.5 w-full pb-1">
            <button onClick={handleRestart}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Restart
            </button>
            <button onClick={onQuit}
              className="w-full py-2 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
              Quit
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl shadow-2xl block h-full w-auto"
            style={{ maxHeight: CANVAS_H }}
          />

          {!anyHand && gs.phase === 'playing' && (
            <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
              <span className="text-5xl mb-3">🙌</span>
              <p className="text-white font-bold text-lg">Show your hands!</p>
              <p className="text-white/50 text-sm mt-1">Hold both hands in front of the camera</p>
            </div>
          )}

          {gs.phase === 'finished' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
              <div className="text-center flex flex-col items-center gap-5 px-8">
                <p className="text-purple-400 font-black text-4xl">Song Complete!</p>
                <div className="flex flex-col gap-2 items-center">
                  <div className="flex gap-6">
                    <Stat label="Score" value={String(gs.score)} color="text-white" />
                    <Stat label="Accuracy" value={`${accuracy(gs)}%`} color="text-purple-300" />
                    <Stat label="Max Combo" value={`×${gs.maxCombo}`} color="text-yellow-300" />
                  </div>
                  <div className="text-white/40 text-sm mt-1">
                    {gs.hitNotes} / {gs.totalNotes} notes hit
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <button onClick={handleRestart}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold rounded-xl transition-all">
                    Play Again
                  </button>
                  <button onClick={onQuit}
                    className="px-6 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
                    Quit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col items-center justify-between gap-3 w-40 shrink-0">
          <div className="flex flex-col gap-1 w-full pt-1">
            <HandBadge color="cyan" label="Left Hand" items={['Hi-Hat', 'Crash', 'Snare', 'Rim']} />
            <HandBadge color="purple" label="Right Hand" items={['Kick', 'Tom', 'Floor Tom', 'Cowbell']} />
          </div>

          <div className="flex-1" />

          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${
              handsData.left && handsData.right ? 'bg-green-400' :
              handsData.left || handsData.right  ? 'bg-yellow-400' : 'bg-red-500'
            }`} />
            {!anyHand && (
              <div className="absolute inset-0 bg-red-900/40 flex items-end justify-center pb-2">
                <span className="text-white text-xs font-bold drop-shadow">No hands</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-black text-3xl tabular-nums ${color}`}>{value}</span>
      <span className="text-white/40 text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function HandBadge({ color, label, items }: { color: 'cyan' | 'purple'; label: string; items: string[] }) {
  const accent = color === 'cyan' ? 'text-cyan-400 border-cyan-400/20' : 'text-purple-400 border-purple-400/20';
  return (
    <div className={`rounded-lg border p-2 ${accent} bg-white/4`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'} mb-1`}>{label}</p>
      {items.map(i => (
        <p key={i} className="text-white/50 text-xs leading-tight">{i}</p>
      ))}
    </div>
  );
}

function DrumKitSvg() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <ellipse cx="70" cy="75" rx="36" ry="18" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2"/>
      <ellipse cx="70" cy="72" rx="34" ry="16" fill="#2e1065" stroke="#a855f7" strokeWidth="1.5"/>
      <line x1="20" y1="80" x2="20" y2="30" stroke="#4b5563" strokeWidth="2"/>
      <ellipse cx="20" cy="28" rx="14" ry="4" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5"/>
      <ellipse cx="20" cy="24" rx="14" ry="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5"/>
      <ellipse cx="70" cy="60" rx="22" ry="8" fill="#1e1b4b" stroke="#ef4444" strokeWidth="1.5"/>
      <rect x="48" y="55" width="44" height="8" rx="2" fill="#1e1b4b" stroke="#ef4444" strokeWidth="1"/>
      <ellipse cx="110" cy="40" rx="16" ry="6" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="1.5"/>
      <rect x="94" y="36" width="32" height="8" rx="2" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="1"/>
      <ellipse cx="110" cy="20" rx="18" ry="5" fill="#1e293b" stroke="#eab308" strokeWidth="1.5"/>
      <line x1="35" y1="50" x2="50" y2="65" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round"/>
      <line x1="105" y1="50" x2="90" y2="65" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
