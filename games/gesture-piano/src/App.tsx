import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking } from './useHandTracking';
import { useMenuHand }     from './useMenuHand';
import { useGameCanvas }   from './useGameCanvas';
import {
  initialGameState, stepGame,
  NUM_KEYS, KEY_COLORS, CANVAS_W, CANVAS_H,
  PRESS_Y_THRESHOLD, accuracy,
} from './gameLogic';
import type { GameState, GameMode } from './gameLogic';
import { playNote, initAudio } from './audio';
import type { MenuHandData } from './useMenuHand';

type Screen = 'landing' | 'howtoplay' | 'modeselect' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode,   setMode]   = useState<GameMode>('freeplay');

  if (screen === 'landing')    return <LandingScreen  onPlay={() => setScreen('modeselect')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay')  return <HowToPlayScreen onBack={() => setScreen('landing')} />;
  if (screen === 'modeselect') return <ModeSelectScreen onSelect={m => { setMode(m); setScreen('game'); }} onBack={() => setScreen('landing')} />;
  return <GameScreen mode={mode} onQuit={() => setScreen('landing')} />;
}

// ── Dwell-to-click ────────────────────────────────────────────────────────────

const DWELL_MS = 900;
const CURSOR_R = 22;

function MenuGestureLayer({ children }: {
  children: (props: {
    hand:           MenuHandData;
    activeId:       string | null;
    dwellProgress:  number;
  }) => React.ReactNode;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const hand        = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef     = useRef(hand);
  handRef.current   = hand;

  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartRef  = useRef<number | null>(null);
  const activeIdRef    = useRef<string | null>(null);
  const rafRef         = useRef<number>(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActiveId(null);
      setDwellProgress(0);
      dwellStartRef.current = null;
      activeIdRef.current   = null;
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;

    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id   = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        hoveredId = id;
      }
    });

    if (hoveredId !== activeIdRef.current) {
      activeIdRef.current   = hoveredId;
      setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null;
      setDwellProgress(0);
    } else if (hoveredId && dwellStartRef.current !== null) {
      const progress = Math.min((ts - dwellStartRef.current) / DWELL_MS, 1);
      setDwellProgress(progress);
      if (progress >= 1) {
        (document.querySelector(`[data-dwell-id="${hoveredId}"]`) as HTMLElement | null)?.click();
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
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {children({ hand, activeId, dwellProgress })}

      {hand.detected && (
        <div className="pointer-events-none fixed z-40"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R,
                   width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6}   fill="#a855f7" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      <div className={`fixed top-3 left-3 z-40 w-2.5 h-2.5 rounded-full border border-black/30 ${hand.detected ? 'bg-green-400' : 'bg-red-500'}`} />
    </div>
  );
}

function GestureBtn({
  dwellId, activeId, dwellProgress, onClick, className = '', children,
}: {
  dwellId:       string;
  activeId:      string | null;
  dwellProgress: number;
  onClick:       () => void;
  className?:    string;
  children:      React.ReactNode;
}) {
  const isActive     = activeId === dwellId;
  const circumference = 2 * Math.PI * (CURSOR_R - 3);
  const dash          = circumference * (isActive ? dwellProgress : 0);

  return (
    <div className="relative">
      <button data-dwell-id={dwellId} onClick={onClick}
        className={`${className} ${isActive ? 'ring-2 ring-purple-400/60' : ''} transition-all`}>
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#a855f7" strokeWidth="3"
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
              transform={`rotate(-90 ${CURSOR_R} ${CURSOR_R})`} />
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
            <PianoSvg />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-black tracking-tight text-white">
                Gesture<span className="text-purple-400">Piano</span>
              </h1>
              <p className="text-gray-400 text-sm tracking-widest uppercase">
                Play piano with your fingertips
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/55 leading-relaxed text-center">
              Lower your fingers into the key zones on screen to press keys.
              In Rhythm mode, catch the falling bars as they reach the hit line.
            </div>

            <p className="text-white/30 text-xs text-center">Hover your hand over a button and hold still to select</p>

            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-purple-900/50">
                PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold text-base rounded-xl tracking-wide transition-all border border-white/10">
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
    { icon: '📷', title: 'Camera Setup',
      desc: 'Face your webcam at chest height. Make sure both hands are clearly visible. Good lighting helps finger tracking.' },
    { icon: '🎹', title: '10 Piano Keys',
      desc: 'The screen is divided into 10 vertical zones, each one a piano key (C4 to E5). Keys are colored — red, orange, yellow, green, cyan, blue, violet, pink, rose, lime.' },
    { icon: '👇', title: 'How to Press a Key',
      desc: 'Lower your fingertip into the bottom portion of the camera frame to press that key. The key lights up when your finger is detected in its zone. You can press multiple keys at once!' },
    { icon: '🎵', title: 'Rhythm Mode — Guitar Hero Style',
      desc: 'Colored bars fall from the top, one lane per key. When a bar reaches the glowing hit line at the bottom, press that key. Hit it on time to score.' },
    { icon: '⭐', title: 'Timing & Scoring',
      desc: 'PERFECT (±65 ms) = 100 pts × combo. GOOD (±130 ms) = 50 pts × combo. Miss resets your combo. Build long combos for massive scores!' },
    { icon: '🎼', title: 'Songs by Difficulty',
      desc: 'Easy: Twinkle Twinkle (bars fall slowly). Medium: Ode to Joy (moderate pace). Hard: Für Elise inspired (fast runs, requires quick fingers).' },
    { icon: '🎸', title: 'Free Play Mode',
      desc: 'No falling bars, no pressure — just explore the piano. Press any key to hear its note. Great for warming up.' },
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
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Mode Select ───────────────────────────────────────────────────────────────

const MODE_OPTIONS: { id: GameMode; label: string; song: string; btn: string; accent: string }[] = [
  { id: 'freeplay', label: 'Free Play',  song: 'No song — explore freely',        accent: 'text-gray-300',   btn: 'bg-gray-700 hover:bg-gray-600' },
  { id: 'easy',     label: 'Easy',       song: 'Twinkle Twinkle — 80 BPM',        accent: 'text-green-400',  btn: 'bg-green-800 hover:bg-green-700' },
  { id: 'medium',   label: 'Medium',     song: 'Ode to Joy — 100 BPM',            accent: 'text-yellow-400', btn: 'bg-yellow-800 hover:bg-yellow-700' },
  { id: 'hard',     label: 'Hard',       song: 'Für Elise inspired — 120 BPM',    accent: 'text-red-400',    btn: 'bg-red-900 hover:bg-red-800' },
];

function ModeSelectScreen({ onSelect, onBack }: { onSelect: (m: GameMode) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _hand, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center">Select Mode</h2>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/55 leading-relaxed">
              <span className="text-purple-400 font-bold">Rhythm modes:</span> colored bars fall toward each key lane — lower your fingertip into the lane when the bar hits the white line.&nbsp;
              <span className="text-yellow-400 font-bold">PERFECT</span> = 100 pts × combo · <span className="text-green-400 font-bold">GOOD</span> = 50 pts × combo.
            </div>

            <div className="flex flex-col gap-2.5">
              {MODE_OPTIONS.map(opt => (
                <GestureBtn key={opt.id} dwellId={`mode-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                  onClick={() => onSelect(opt.id)}
                  className={`w-full py-3.5 ${opt.btn} active:scale-95 text-white rounded-xl transition-all shadow-lg flex items-center justify-between px-5`}>
                  <div className="flex flex-col items-start">
                    <span className={`font-black text-lg ${opt.accent}`}>{opt.label}</span>
                    <span className="text-white/50 text-xs">{opt.song}</span>
                  </div>
                </GestureBtn>
              ))}
            </div>

            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full py-3 bg-white/8 hover:bg-white/12 active:scale-95 text-white font-semibold rounded-xl transition-all border border-white/10">
              Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function getActiveKeys(fingertips: { x: number; y: number }[]): Set<number> {
  const active = new Set<number>();
  for (const ft of fingertips) {
    if (ft.y > PRESS_Y_THRESHOLD) {
      const ki = Math.min(NUM_KEYS - 1, Math.max(0, Math.floor(ft.x * NUM_KEYS)));
      active.add(ki);
    }
  }
  return active;
}

function GameScreen({ mode, onQuit }: { mode: GameMode; onQuit: () => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);

  const gameStateRef = useRef<GameState>(initialGameState(mode));
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);

  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef<number>(0);
  const prevKeysRef    = useRef<Set<number>>(new Set());
  const pressedKeysRef = useRef<Set<number>>(new Set());

  const handsData    = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef     = useRef(handsData);
  handsRef.current   = handsData;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const hands   = handsRef.current;
    let   gs      = gameStateRef.current;

    if (gs.phase === 'playing') {
      const currentKeys  = getActiveKeys(hands.fingertips);
      const newlyPressed = new Set<number>();
      for (const k of currentKeys) {
        if (!prevKeysRef.current.has(k)) newlyPressed.add(k);
      }
      prevKeysRef.current  = currentKeys;
      pressedKeysRef.current = currentKeys;

      // Play audio for newly pressed keys
      for (const k of newlyPressed) {
        playNote(k);
      }

      gs = stepGame(gs, delta, ts, newlyPressed);

      gameStateRef.current = gs;
      setDisplayState({ ...gs });
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // Draw canvas after state update
  useEffect(() => {
    draw({
      state:       displayState,
      fingertips:  handsRef.current.fingertips,
      pressedKeys: pressedKeysRef.current,
      videoEl:     videoRef.current,
    });
  }, [displayState, draw]);

  // Post score to parent when song ends
  useEffect(() => {
    if (displayState.phase === 'finished') {
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: displayState.score }, '*');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.phase]);

  const handleRestart = () => {
    gameStateRef.current   = initialGameState(mode);
    prevKeysRef.current    = new Set();
    pressedKeysRef.current = new Set();
    setDisplayState(gameStateRef.current);
  };

  const gs      = displayState;
  const anyHand = handsData.leftDetected || handsData.rightDetected;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-stretch gap-4 h-full py-4 px-4" style={{ maxHeight: CANVAS_H + 32 }}>

        {/* ── Left panel ── */}
        <div className="flex flex-col items-center justify-between gap-3 w-28 shrink-0">
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="text-2xl">🎹</span>
            <span className="text-purple-400/60 text-xs font-bold uppercase tracking-widest">Piano</span>
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
                    <Stat label="Score"    value={String(gs.score)}       color="text-white" />
                    <Stat label="Accuracy" value={`${accuracy(gs)}%`}     color="text-purple-300" />
                    <Stat label="Max Combo" value={`×${gs.maxCombo}`}     color="text-yellow-300" />
                  </div>
                  <p className="text-white/40 text-sm">{gs.hitNotes} / {gs.totalNotes} notes hit</p>
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
          {/* Key legend */}
          <div className="flex flex-col gap-1 w-full pt-1">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-0.5">Keys</p>
            <div className="grid grid-cols-2 gap-1">
              {['C','D','E','F','G','A','B','C\'','D\'','E\''].map((name, i) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: KEY_COLORS[i] }} />
                  <span className="text-white/50 text-xs">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Webcam preview */}
          <div className="relative rounded-xl overflow-hidden border-2 border-white/12 shadow-xl w-full" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              muted
              playsInline
            />
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${
              handsData.leftDetected && handsData.rightDetected ? 'bg-green-400' :
              handsData.leftDetected || handsData.rightDetected ? 'bg-yellow-400' : 'bg-red-500'
            }`} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-black text-3xl tabular-nums ${color}`}>{value}</span>
      <span className="text-white/40 text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function PianoSvg() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" fill="none">
      {/* White keys */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={i * 24 + 4} y={10} width={22} height={70} rx={3}
          fill="#1e293b" stroke="#7c3aed" strokeWidth="1.5" />
      ))}
      {/* Black keys */}
      {[0,1,3,4,5].map((i, idx) => (
        <rect key={idx} x={i * 24 + 17} y={10} width={14} height={44} rx={2}
          fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
      ))}
      {/* Color glow dots at top of each white key */}
      {['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6'].map((c, i) => (
        <circle key={i} cx={i * 24 + 15} cy={18} r={4} fill={c} opacity="0.7" />
      ))}
    </svg>
  );
}
