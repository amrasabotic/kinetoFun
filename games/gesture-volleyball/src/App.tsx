import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }   from './useHandTracking';
import { useMenuHand }       from './useMenuHand';
import { useGameCanvas } from './useGameCanvas';
import { deriveVolleyballGesture, useGestureRefs } from './useGesture';
import { initialGameState, stepGame, WINNING_SCORE, CANVAS_W, CANVAS_H } from './gameLogic';
import type { GameState, Difficulty, VolleyGestureInput } from './gameLogic';
import {
  initAudio, playHit, playSmash, playBlock,
  playAIHit, playAISmash, playServe,
  playPointScored, playPointLost, playGameOver,
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
const CURSOR_R = 26;

function MenuGestureLayer({ children }: {
  children: (props: { hand: MenuHandData; activeId: string | null; dwellProgress: number }) => React.ReactNode;
}) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const hand         = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef      = useRef(hand);
  handRef.current    = hand;

  const [activeId,      setActiveId]      = useState<string | null>(null);
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

    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;

    let hoveredId: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const id   = (el as HTMLElement).dataset.dwellId!;
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) hoveredId = id;
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
        dwellStartRef.current = null; setActiveId(null); setDwellProgress(0); activeIdRef.current = null;
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

      {/* Hand cursor */}
      {hand.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 2} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="2" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={8} fill="#38bdf8" fillOpacity="0.95" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={4} fill="white" fillOpacity="0.8" />
          </svg>
        </div>
      )}
      {/* Camera status dot */}
      <div className={`fixed top-4 left-4 z-50 flex items-center gap-2`}>
        <div className={`w-3 h-3 rounded-full border-2 border-black/20 shadow ${hand.detected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white/40 text-xs">{hand.detected ? 'Hand detected' : 'No hand'}</span>
      </div>
    </div>
  );
}

// GestureBtn — large touch-target button with bottom fill-bar dwell indicator
function GestureBtn({
  dwellId, activeId, dwellProgress, onClick, className = '', style, children,
}: {
  dwellId: string; activeId: string | null; dwellProgress: number;
  onClick: () => void; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  const isActive = activeId === dwellId;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button
        data-dwell-id={dwellId}
        onClick={(e) => { if (e.isTrusted) return; onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none', ...style }}
        className={`${className} ${isActive ? 'brightness-110 scale-[1.02]' : ''} transition-all duration-150 relative`}>
        {children}
      </button>
      {/* Dwell progress bar — grows left→right along the bottom edge */}
      <div
        className="absolute bottom-0 left-0 h-[4px] rounded-full transition-none pointer-events-none"
        style={{
          width:      `${isActive ? dwellProgress * 100 : 0}%`,
          background: 'linear-gradient(90deg,#38bdf8,#818cf8)',
          opacity:    isActive ? 1 : 0,
        }}
      />
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6"
          style={{ background: 'linear-gradient(160deg,#061428 0%,#0a2040 45%,#061020 100%)' }}>

          {/* Subtle court net line decoration */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-10"
            style={{ background: 'linear-gradient(to top,#38bdf8 0%,transparent 100%)' }} />

          <div className="flex flex-col items-center gap-7 w-full max-w-lg relative z-10">
            {/* Hero icon */}
            <div className="relative">
              <div className="text-[96px] leading-none select-none drop-shadow-2xl">🏐</div>
              <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
                style={{ background: 'radial-gradient(circle,#38bdf8,transparent 70%)' }} />
            </div>

            {/* Title */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-6xl font-black tracking-tight leading-none"
                style={{ background: 'linear-gradient(90deg,#fff 30%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gesture<br />Volleyball
              </h1>
              <p className="text-sky-300/70 text-sm tracking-[0.2em] uppercase font-medium">
                Smash · Block · Win
              </p>
            </div>

            {/* Gesture quick-reference pills */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { icon: '↔️', label: 'Move', color: 'from-slate-700/80 to-slate-800/80', border: 'border-slate-600/40' },
                { icon: '☝️', label: 'Smash', color: 'from-amber-900/60 to-orange-900/60', border: 'border-amber-500/30' },
                { icon: '🤲', label: 'Block', color: 'from-sky-900/60 to-blue-900/60', border: 'border-sky-500/30' },
              ].map(g => (
                <div key={g.label}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gradient-to-b ${g.color} border ${g.border}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <span className="text-white/80 text-xs font-bold tracking-wide uppercase">{g.label}</span>
                </div>
              ))}
            </div>

            {/* Dwell hint */}
            <p className="text-white/25 text-xs text-center">
              Hover your hand over a button and hold still for 1 second to select
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-4 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full min-h-[88px] flex items-center justify-center gap-3 text-white font-black text-2xl rounded-2xl tracking-wide transition-all shadow-2xl"
                style={{ background: 'linear-gradient(135deg,#0284c7 0%,#0ea5e9 50%,#38bdf8 100%)', boxShadow: '0 8px 40px rgba(56,189,248,0.35)' } as React.CSSProperties}>
                <span className="text-3xl">▶</span> PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full min-h-[72px] flex items-center justify-center text-white/80 font-bold text-lg rounded-2xl tracking-wide transition-all border border-white/15"
                style={{ background: 'rgba(255,255,255,0.06)' } as React.CSSProperties}>
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
  { icon: '📷', title: 'Camera Setup',      color: '#64748b',
    desc: 'Position your webcam so your upper body and both arms are visible. Good lighting improves hand tracking.' },
  { icon: '↔️', title: 'Move & Position',   color: '#94a3b8',
    desc: 'Move your hand(s) left and right — the average wrist position drives your player across your half of the court.' },
  { icon: '☝️', title: 'Smash Hit',         color: '#f59e0b',
    desc: 'Raise one hand above forehead level. When the ball is nearby, your player smashes it fast and flat. Lower your hand to reset and smash again.' },
  { icon: '🤲', title: 'Block',             color: '#38bdf8',
    desc: 'Spread both hands far apart horizontally. Your player spreads their arms to deflect the ball back over the net.' },
  { icon: '🤖', title: 'AI Opponent',       color: '#a78bfa',
    desc: 'Difficulty controls AI speed and smash rate. Easy sometimes misses; Hard almost never does.' },
  { icon: '🏆', title: 'Scoring',           color: '#facc15',
    desc: `First to ${WINNING_SCORE} points wins. Score when the ball hits the floor on the opponent's side. Serves alternate each point.` },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-4"
          style={{ background: 'linear-gradient(160deg,#061428 0%,#0a2040 45%,#061020 100%)' }}>

          <div className="w-full max-w-lg flex flex-col gap-4 h-full">
            <h2 className="text-4xl font-black text-white text-center pt-2 shrink-0">How to Play</h2>

            <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-1">
              {HOW_ITEMS.map(item => (
                <div key={item.title}
                  className="flex gap-4 rounded-2xl p-4 border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                    style={{ background: `${item.color}22`, border: `1.5px solid ${item.color}44` }}>
                    {item.icon}
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-white font-bold text-base">{item.title}</p>
                    <p className="text-white/50 text-sm leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0">
              <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onBack}
                className="w-full min-h-[72px] flex items-center justify-center text-white/80 font-bold text-lg rounded-2xl transition-all border border-white/15"
                style={{ background: 'rgba(255,255,255,0.07)' } as React.CSSProperties}>
                ← Back
              </GestureBtn>
            </div>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Difficulty Screen ─────────────────────────────────────────────────────────

const DIFF_OPTIONS: {
  id: Difficulty; emoji: string; label: string; tagline: string;
  desc: string; stars: number; grad: string; glow: string; border: string;
}[] = [
  {
    id: 'easy', emoji: '🌊', label: 'Easy', tagline: 'Learn the ropes',
    desc: 'Slow AI · misses occasionally · perfect for first timers',
    stars: 1, grad: 'linear-gradient(135deg,#064e3b,#065f46)', glow: '#10b981', border: '#10b98140',
  },
  {
    id: 'normal', emoji: '🏐', label: 'Normal', tagline: 'Balanced rally',
    desc: 'Medium speed · reliable returns · occasional smashes',
    stars: 3, grad: 'linear-gradient(135deg,#78350f,#92400e)', glow: '#f59e0b', border: '#f59e0b40',
  },
  {
    id: 'hard', emoji: '⚡', label: 'Hard', tagline: 'No mercy',
    desc: 'Fast reflexes · frequent smashes · almost never misses',
    stars: 5, grad: 'linear-gradient(135deg,#7f1d1d,#991b1b)', glow: '#ef4444', border: '#ef444440',
  },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-6"
          style={{ background: 'linear-gradient(160deg,#061428 0%,#0a2040 45%,#061020 100%)' }}>

          <div className="w-full max-w-lg flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-4xl font-black text-white">Pick Your Challenge</h2>
              <p className="text-white/35 text-sm mt-1">Hover over a difficulty to select it</p>
            </div>

            <div className="flex flex-col gap-4">
              {DIFF_OPTIONS.map(opt => (
                <GestureBtn key={opt.id} dwellId={`diff-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                  onClick={() => onSelect(opt.id)}
                  className="w-full min-h-[96px] flex items-center gap-5 px-6 rounded-2xl transition-all"
                  style={{
                    background:  opt.grad,
                    border:      `1.5px solid ${opt.border}`,
                    boxShadow:   activeId === `diff-${opt.id}` ? `0 0 28px ${opt.glow}55` : 'none',
                  } as React.CSSProperties}>
                  {/* Big emoji */}
                  <span className="text-5xl shrink-0">{opt.emoji}</span>
                  {/* Text */}
                  <div className="flex flex-col flex-1 items-start">
                    <div className="flex items-baseline gap-3">
                      <span className="text-white font-black text-2xl">{opt.label}</span>
                      <span className="text-white/50 text-sm font-medium">{opt.tagline}</span>
                    </div>
                    <span className="text-white/55 text-sm mt-0.5">{opt.desc}</span>
                  </div>
                  {/* Star meter */}
                  <div className="flex gap-1 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-lg" style={{ opacity: i < opt.stars ? 1 : 0.18 }}>★</span>
                    ))}
                  </div>
                </GestureBtn>
              ))}
            </div>

            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full min-h-[68px] flex items-center justify-center text-white/70 font-bold text-lg rounded-2xl transition-all border border-white/12"
              style={{ background: 'rgba(255,255,255,0.06)' } as React.CSSProperties}>
              ← Back
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

  const rafRef       = useRef<number>(0);
  const lastTimeRef  = useRef<number>(0);
  const scoreSentRef = useRef(false);

  const { smashFiredRef } = useGestureRefs();

  const handsRaw   = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef   = useRef(handsRaw);
  handsRef.current = handsRaw;

  const gestureRef = useRef<VolleyGestureInput>({
    playerX: 0.5, isSmashing: false, isBlocking: false,
    highestHandY: 1, handsSpread: 0, handDetected: false,
  });

  const draw = useGameCanvas(canvasRef as React.RefObject<HTMLCanvasElement>);

  const loop = useCallback((ts: number) => {
    const rawDt = lastTimeRef.current ? ts - lastTimeRef.current : 16;
    const dt    = Math.min(rawDt, 50) / 16.67;
    lastTimeRef.current = ts;

    const raw     = handsRef.current;
    const gesture = deriveVolleyballGesture(raw.hands, raw.handednesses, smashFiredRef);
    gestureRef.current = gesture;

    let gs = gameStateRef.current;

    if (gs.phase !== 'game_over') {
      const newGs = stepGame(gs, dt, gesture);

      // Audio
      if (newGs.audioTrigger !== null) {
        switch (newGs.audioTrigger) {
          case 'player_hit':    playHit();          break;
          case 'player_smash':  playSmash();        break;
          case 'player_block':  playBlock();        break;
          case 'ai_hit':        playAIHit();        break;
          case 'ai_smash':      playAISmash();      break;
          case 'serve':         playServe();        break;
          case 'point_player':  playPointScored();  break;
          case 'point_ai':      playPointLost();    break;
          case 'gameover':      playGameOver();     break;
        }
      }

      // Post score when game ends
      if (newGs.phase === 'game_over' && gs.phase !== 'game_over' && !scoreSentRef.current) {
        scoreSentRef.current = true;
        const bonus = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 50 : 100;
        window.parent.postMessage(
          { type: 'GAME_COMPLETE', score: newGs.player.score * 100 + bonus },
          '*',
        );
      }

      gs = newGs;
      gameStateRef.current = gs;
      setDisplayState({ ...gs });
    }

    draw({ state: gs, videoEl: videoRef.current, gesture: gestureRef.current });
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, smashFiredRef, difficulty]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const handleRestart = () => {
    gameStateRef.current  = initialGameState(difficulty);
    scoreSentRef.current  = false;
    smashFiredRef.current = false;
    setDisplayState(gameStateRef.current);
  };

  const gs       = displayState;
  const anyHand  = handsRaw.leftDetected || handsRaw.rightDetected;
  const isGameOver = gs.phase === 'game_over';

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden gap-3 px-2">

      {/* Score row above canvas */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: CANVAS_W }}>
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-black text-2xl tabular-nums">{gs.player.score}</span>
          <span className="text-white/40 text-sm font-semibold">YOU</span>
        </div>
        <div className="text-white/30 text-xs text-center px-3">
          {gs.phase === 'game_over'
            ? (gs.winner === 'player' ? '🏆 You Win!' : '😔 AI Wins')
            : `First to ${WINNING_SCORE}`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-semibold">AI</span>
          <span className="text-red-400 font-black text-2xl tabular-nums">{gs.ai.score}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl shadow-2xl block"
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 130px)' }}
        />

        {/* No-hand prompt */}
        {!anyHand && !isGameOver && gs.phase === 'playing' && (
          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
            <span className="text-5xl mb-3">🙌</span>
            <p className="text-white font-bold text-lg">Show your hands!</p>
            <p className="text-white/50 text-sm mt-1">Hold your hands in front of the camera</p>
          </div>
        )}

        {/* Game over overlay */}
        {isGameOver && (
          <GameOverOverlay gs={gs} onRestart={handleRestart} onQuit={onQuit} />
        )}
      </div>

      {/* Controls strip below canvas */}
      <div className="flex items-center gap-4">
        <div className={`w-2.5 h-2.5 rounded-full border border-black/30 flex-shrink-0 ${anyHand ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className="text-white/35 text-xs">{anyHand ? 'Hands detected' : 'No hands detected'}</span>
        <div className="flex gap-2">
          <button onClick={handleRestart}
            className="px-4 py-1.5 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
            Restart
          </button>
          <button onClick={onQuit}
            className="px-4 py-1.5 bg-white/8 hover:bg-white/14 active:scale-95 text-white/65 text-xs font-semibold rounded-lg transition-all border border-white/10">
            Quit
          </button>
        </div>
      </div>

      {/* Hidden video element (MediaPipe streams into this) */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1"
        muted
        playsInline
      />
    </div>
  );
}

// ── Game Over overlay ─────────────────────────────────────────────────────────

function GameOverOverlay({ gs, onRestart, onQuit }: {
  gs: GameState; onRestart: () => void; onQuit: () => void;
}) {
  const won = gs.winner === 'player';
  return (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(6px)' }}>
      <div className="text-center flex flex-col items-center gap-5 px-8">
        <div className="text-6xl">{won ? '🏆' : '😔'}</div>
        <p className={`font-black text-4xl ${won ? 'text-yellow-400' : 'text-red-400'}`}>
          {won ? 'You Win!' : 'AI Wins!'}
        </p>
        <div className="flex gap-10 items-center">
          <div className="flex flex-col items-center">
            <span className="text-sky-300 font-black text-5xl tabular-nums">{gs.player.score}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest mt-1">You</span>
          </div>
          <span className="text-white/30 text-3xl">–</span>
          <div className="flex flex-col items-center">
            <span className="text-red-300 font-black text-5xl tabular-nums">{gs.ai.score}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest mt-1">AI</span>
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={onRestart}
            className="px-8 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-xl transition-all">
            Play Again
          </button>
          <button onClick={onQuit}
            className="px-8 py-2.5 bg-white/12 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl transition-all">
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
