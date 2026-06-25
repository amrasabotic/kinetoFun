import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }   from './useHandTracking';
import { useMenuHand }       from './useMenuHand';
import { useGameCanvas, CANVAS_W, CANVAS_H } from './useGameCanvas';
import { deriveGesture, useGestureRefs } from './useGesture';
import {
  initialGameState, stepGame,
  PIECE_COLORS, PIECE_TYPE_LIST, pieceMatrix,
} from './gameLogic';
import type { GameState, Difficulty, Piece } from './gameLogic';
import {
  initAudio, playMove, playRotate, playLock,
  playSoftDrop, playLineClear, playLevelUp, playGameOver,
} from './audio';
import type { MenuHandData } from './useMenuHand';

// ── Screen router ─────────────────────────────────────────────────────────────

type Screen = 'landing' | 'howtoplay' | 'difficulty' | 'game';

export default function App() {
  const [screen,     setScreen]     = useState<Screen>('landing');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  if (screen === 'landing')    return <LandingScreen    onPlay={() => setScreen('difficulty')} onHow={() => setScreen('howtoplay')} />;
  if (screen === 'howtoplay')  return <HowToPlayScreen  onBack={() => setScreen('landing')} />;
  if (screen === 'difficulty') return <DifficultyScreen onSelect={d => { setDifficulty(d); setScreen('game'); }} onBack={() => setScreen('landing')} />;
  return <GameScreen difficulty={difficulty} onQuit={() => setScreen('landing')} />;
}

// ── Dwell-to-click (menu gesture layer) ──────────────────────────────────────

const DWELL_MS = 900;
const CURSOR_R = 22;

function MenuGestureLayer({ children }: {
  children: (props: {
    hand:          MenuHandData;
    activeId:      string | null;
    dwellProgress: number;
  }) => React.ReactNode;
}) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hand          = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef       = useRef(hand);
  handRef.current     = hand;

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
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={6}            fill="#06b6d4" fillOpacity="0.9" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 1} fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth="1.5" />
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
  const isActive      = activeId === dwellId;
  const circumference = 2 * Math.PI * (CURSOR_R - 3);
  const dash          = circumference * (isActive ? dwellProgress : 0);

  return (
    <div className="relative">
      <button
        data-dwell-id={dwellId}
        onClick={(e) => { if (e.isTrusted) return; onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none' }}
        className={`${className} ${isActive ? 'ring-2 ring-cyan-400/60' : ''} transition-all`}
      >
        {children}
      </button>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2} className="absolute">
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="#06b6d4" strokeWidth="3"
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
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="flex flex-col items-center gap-8 w-full max-w-sm">
            <TetrisSvg />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-black tracking-tight text-white">
                Gesture<span className="text-cyan-400">Tetris</span>
              </h1>
              <p className="text-gray-400 text-sm tracking-widest uppercase">
                Tilt your hand to guide the blocks
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/55 leading-relaxed text-center">
              Tilt left/right to move · Raise hand to rotate · Lower hand to drop fast
            </div>

            <p className="text-white/30 text-xs text-center">
              Hover your hand over a button and hold still to select
            </p>

            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-black text-xl rounded-xl tracking-wide transition-all shadow-lg shadow-cyan-900/50">
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

// ── How To Play Screen ────────────────────────────────────────────────────────

const HOW_ITEMS = [
  { icon: '📷', title: 'Camera Setup',
    desc: 'Position your webcam so your torso and upper arms are visible. Good lighting helps tracking accuracy.' },
  { icon: '↔️', title: 'Tilt to Move',
    desc: 'Tilt your whole hand left or right (like a steering wheel) to slide the falling piece in that direction. The further you tilt, the faster it moves.' },
  { icon: '☝️', title: 'Raise to Rotate',
    desc: 'Lift your wrist high (into the top third of the camera frame) to rotate the piece clockwise. Return to neutral zone before raising again.' },
  { icon: '👇', title: 'Lower to Drop Fast',
    desc: 'Push your wrist down low (into the bottom third of the frame) for a soft-drop — the piece falls 8× faster. Release to return to normal speed.' },
  { icon: '🎯', title: 'Scoring',
    desc: '1 line = 100 pts × level · 2 lines = 300 pts · 3 lines = 500 pts · 4 lines (Tetris!) = 800 pts × level. Level up every 10 lines cleared — pieces fall faster!' },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-5">
            <h2 className="text-3xl font-black text-white text-center">How to Play</h2>
            <div className="flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {HOW_ITEMS.map(item => (
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

// ── Difficulty Screen ─────────────────────────────────────────────────────────

const DIFF_OPTIONS: { id: Difficulty; label: string; desc: string; btn: string; accent: string }[] = [
  { id: 'easy',   label: 'Easy',   desc: 'Starts at level 1 — slow and forgiving',       accent: 'text-green-400',  btn: 'bg-green-800 hover:bg-green-700' },
  { id: 'normal', label: 'Normal', desc: 'Starts at level 3 — steady challenge',          accent: 'text-yellow-400', btn: 'bg-yellow-800 hover:bg-yellow-700' },
  { id: 'hard',   label: 'Hard',   desc: 'Starts at level 6 — fast from the first piece', accent: 'text-red-400',    btn: 'bg-red-900 hover:bg-red-800' },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden px-6">
          <div className="w-full max-w-md flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white text-center">Select Difficulty</h2>

            <div className="flex flex-col gap-2.5">
              {DIFF_OPTIONS.map(opt => (
                <GestureBtn key={opt.id} dwellId={`diff-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                  onClick={() => onSelect(opt.id)}
                  className={`w-full py-3.5 ${opt.btn} active:scale-95 text-white rounded-xl transition-all shadow-lg flex items-center justify-between px-5`}>
                  <div className="flex flex-col items-start">
                    <span className={`font-black text-lg ${opt.accent}`}>{opt.label}</span>
                    <span className="text-white/50 text-xs">{opt.desc}</span>
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

function GameScreen({ difficulty, onQuit }: { difficulty: Difficulty; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);

  const gameStateRef   = useRef<GameState>(initialGameState(difficulty));
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);

  const rafRef          = useRef<number>(0);
  const lastTimeRef     = useRef<number>(0);
  const scoreSentRef    = useRef(false);
  const prevLevelRef    = useRef(gameStateRef.current.level);

  const { raisedFiredRef } = useGestureRefs();

  const handsRaw    = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef    = useRef(handsRaw);
  handsRef.current  = handsRaw;

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const delta = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;

    const raw     = handsRef.current;
    const gesture = deriveGesture(raw.hands, raisedFiredRef);
    let gs        = gameStateRef.current;

    if (gs.phase !== 'gameOver') {
      const prevLines = gs.lines;
      const prevLocked = gs.phase === 'playing' &&
        !gesture.tiltDir && !gesture.isRaised; // rough proxy for "piece just locked"

      const newGs = stepGame(gs, delta, gesture);

      // Audio triggers
      if (newGs.phase !== 'gameOver') {
        if (gesture.tiltDir !== 'none' && newGs.currentPos.x !== gs.currentPos.x) playMove();
        if (gesture.isRaised && newGs.current.rotation !== gs.current.rotation) playRotate();
        if (gesture.isLowered && newGs.phase === 'playing') playSoftDrop();
        // Piece locked (changed to lineClear or new piece spawned)
        if ((newGs.phase === 'lineClear' || newGs.current !== gs.current) && prevLocked) playLock();
        // Lines cleared
        if (newGs.lastCleared > 0 && newGs.phase === 'lineClear') {
          playLineClear(newGs.lastCleared);
        }
        // Level up
        if (newGs.level > prevLevelRef.current) {
          playLevelUp();
          prevLevelRef.current = newGs.level;
        }
        // Piece just changed (locked and spawned)
        if (newGs.current !== gs.current && gs.phase === 'playing' && newGs.phase === 'playing') {
          playLock();
        }
      }

      if (newGs.phase === 'gameOver' && !scoreSentRef.current) {
        scoreSentRef.current = true;
        playGameOver();
        window.parent.postMessage({ type: 'GAME_COMPLETE', score: newGs.score }, '*');
      }

      gs = newGs;
      gameStateRef.current = gs;
      setDisplayState({ ...gs });
      void prevLines;
      void prevLocked;
    }

    draw({ state: gs, videoEl: videoRef.current });

    rafRef.current = requestAnimationFrame(loop);
  }, [draw, raisedFiredRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const handleRestart = () => {
    gameStateRef.current = initialGameState(difficulty);
    scoreSentRef.current = false;
    prevLevelRef.current = gameStateRef.current.level;
    raisedFiredRef.current = false;
    setDisplayState(gameStateRef.current);
  };

  const gs       = displayState;
  const anyHand  = handsRaw.leftDetected || handsRaw.rightDetected;

  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden">
      <div className="flex items-stretch gap-4 h-full py-4 px-4" style={{ maxHeight: CANVAS_H + 32 }}>

        {/* Left panel */}
        <div className="flex flex-col items-center justify-between gap-3 w-28 shrink-0">
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="text-2xl">🟦</span>
            <span className="text-cyan-400/60 text-xs font-bold uppercase tracking-widest">Tetris</span>
          </div>

          <div className="flex flex-col gap-3 w-full items-center">
            <StatBox label="Score" value={String(gs.score)} color="text-white" />
            <StatBox label="Level" value={String(gs.level)} color="text-cyan-400" />
            <StatBox label="Lines" value={String(gs.lines)} color="text-purple-400" />
          </div>

          <div className="flex-1" />

          {/* Gesture indicators */}
          <div className="flex flex-col gap-1.5 w-full">
            <GestureIndicator label="Tilt ←→" active={false} color="text-cyan-400" />
            <p className="text-white/20 text-center" style={{ fontSize: 9 }}>Move</p>
            <GestureIndicator label="Raise ↑" active={false} color="text-yellow-400" />
            <p className="text-white/20 text-center" style={{ fontSize: 9 }}>Rotate</p>
            <GestureIndicator label="Lower ↓" active={false} color="text-orange-400" />
            <p className="text-white/20 text-center" style={{ fontSize: 9 }}>Fast drop</p>
          </div>

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

        {/* Canvas */}
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
              style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(3px)' }}>
              <span className="text-5xl mb-3">🙌</span>
              <p className="text-white font-bold text-lg">Show your hand!</p>
              <p className="text-white/50 text-sm mt-1">Hold your hand in front of the camera</p>
            </div>
          )}

          {gs.phase === 'gameOver' && (
            <GameOverOverlay gs={gs} onRestart={handleRestart} onQuit={onQuit} />
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center justify-between gap-3 w-36 shrink-0">

          {/* Next pieces */}
          <div className="w-full pt-1">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Next</p>
            <div className="flex flex-col gap-2">
              {gs.next.slice(0, 3).map((piece, i) => (
                <PiecePreview key={i} piece={piece} size={i === 0 ? 'md' : 'sm'} />
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
            <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30 ${anyHand ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Game Over overlay ─────────────────────────────────────────────────────────

function GameOverOverlay({ gs, onRestart, onQuit }: { gs: GameState; onRestart: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="text-center flex flex-col items-center gap-5 px-8">
        <p className="text-red-400 font-black text-4xl">Game Over</p>
        <div className="flex gap-6">
          <Stat label="Score"  value={String(gs.score)} color="text-white" />
          <Stat label="Level"  value={String(gs.level)} color="text-cyan-300" />
          <Stat label="Lines"  value={String(gs.lines)} color="text-purple-300" />
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={onRestart}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold rounded-xl transition-all">
            Play Again
          </button>
          <button onClick={onQuit}
            className="px-6 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Piece preview (next queue) ────────────────────────────────────────────────

function PiecePreview({ piece, size }: { piece: Piece; size: 'sm' | 'md' }) {
  const matrix = pieceMatrix(piece);
  const color  = PIECE_COLORS[piece.type];
  const cs     = size === 'md' ? 14 : 10;
  const cols   = matrix[0].length;

  return (
    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-center" style={{ minHeight: size === 'md' ? 52 : 38 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cs}px)`, gap: 1 }}>
        {matrix.flat().map((cell, idx) => (
          <div key={idx}
            style={{ width: cs, height: cs, background: cell ? color : 'transparent',
              borderRadius: 2, opacity: cell ? 1 : 0 }} />
        ))}
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-black text-3xl tabular-nums ${color}`}>{value}</span>
      <span className="text-white/40 text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 w-full">
      <span className="text-white/40 text-xs uppercase tracking-widest">{label}</span>
      <span className={`font-black text-2xl tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function GestureIndicator({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div className={`text-center text-xs font-semibold px-2 py-0.5 rounded-md border ${active ? `${color} border-current bg-white/10` : 'text-white/25 border-white/10'}`}>
      {label}
    </div>
  );
}

// ── Tetris SVG logo ───────────────────────────────────────────────────────────

function TetrisSvg() {
  const colors = Object.values(PIECE_COLORS);
  const blocks = [
    // T-piece
    { x: 10, y: 10, c: colors[2] }, { x: 40, y: 10, c: colors[2] }, { x: 70, y: 10, c: colors[2] },
    { x: 40, y: 40, c: colors[2] },
    // I-piece
    { x: 100, y: 25, c: colors[0] }, { x: 130, y: 25, c: colors[0] },
    { x: 160, y: 25, c: colors[0] },
    // S-piece
    { x: 40, y: 70, c: colors[3] }, { x: 70, y: 70, c: colors[3] },
    { x: 10, y: 100, c: colors[3] }, { x: 40, y: 100, c: colors[3] },
    // L-piece
    { x: 100, y: 55, c: colors[6] }, { x: 100, y: 85, c: colors[6] },
    { x: 100, y: 115, c: colors[6] }, { x: 130, y: 115, c: colors[6] },
  ];

  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={26} height={26} rx={4}
          fill={b.c} opacity="0.85" />
      ))}
    </svg>
  );
}

// suppress unused warning
void PIECE_TYPE_LIST;
