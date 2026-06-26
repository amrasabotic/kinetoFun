import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }  from './useHandTracking';
import { useMenuHand }      from './useMenuHand';
import { deriveBasketGesture, useGestureRefs } from './useGesture';
import {
  initialGameState, stepGame, previewArc,
  CANVAS_W, CANVAS_H, FLOOR_Y,
  PLAYER_X, PLAYER_FOOT_Y, BALL_START_X, BALL_START_Y, BALL_R,
  HOOP_CX, HOOP_Y, RIM_LEFT, RIM_RIGHT,
  BACKBOARD_X1, BACKBOARD_X2, BACKBOARD_Y1, BACKBOARD_Y2,
  DIFF_CONFIG, MAX_SHOTS, POINTS_PER_BASKET,
  aimAngleFromX,
} from './gameLogic';
import type { GameState, Difficulty } from './gameLogic';
import {
  initAudio, playShoot, playSwish, playBank,
  playMissRim, playMissAir, playGameOver,
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

// ── Dwell-to-click menu gesture layer ─────────────────────────────────────────

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
      {hand.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 2} fill="none" stroke="rgba(251,146,60,0.25)" strokeWidth="2" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={8} fill="#fb923c" fillOpacity="0.95" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={4} fill="white" fillOpacity="0.8" />
          </svg>
        </div>
      )}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full border-2 border-black/20 shadow ${hand.detected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white/40 text-xs">{hand.detected ? 'Hand detected' : 'No hand'}</span>
      </div>
    </div>
  );
}

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
      <div
        className="absolute bottom-0 left-0 h-[4px] rounded-full transition-none pointer-events-none"
        style={{
          width:      `${isActive ? dwellProgress * 100 : 0}%`,
          background: 'linear-gradient(90deg,#fb923c,#fbbf24)',
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
          style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#2d1200 40%,#0a0500 100%)' }}>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-15"
            style={{ background: 'linear-gradient(to top,#f97316 0%,transparent 100%)' }} />

          <div className="flex flex-col items-center gap-7 w-full max-w-lg relative z-10">
            <div className="relative">
              <div className="text-[96px] leading-none select-none drop-shadow-2xl">🏀</div>
              <div className="absolute inset-0 rounded-full blur-2xl opacity-35"
                style={{ background: 'radial-gradient(circle,#f97316,transparent 70%)' }} />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-6xl font-black tracking-tight leading-none"
                style={{ background: 'linear-gradient(90deg,#fff 30%,#fb923c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gesture<br />Basketball
              </h1>
              <p className="text-orange-300/70 text-sm tracking-[0.2em] uppercase font-medium">
                Aim · Time · Score
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { icon: '↔️', label: 'Aim',    color: 'from-orange-900/70 to-amber-900/70',  border: 'border-orange-500/30' },
                { icon: '📊', label: 'Power',  color: 'from-yellow-900/60 to-orange-900/60', border: 'border-yellow-500/30' },
                { icon: '✋', label: 'Shoot',  color: 'from-red-900/60 to-orange-900/60',    border: 'border-red-500/30'    },
              ].map(g => (
                <div key={g.label}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gradient-to-b ${g.color} border ${g.border}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <span className="text-white/80 text-xs font-bold tracking-wide uppercase">{g.label}</span>
                </div>
              ))}
            </div>

            <p className="text-white/25 text-xs text-center">
              Hover your hand over a button and hold still for 1 second to select
            </p>

            <div className="flex flex-col gap-4 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full min-h-[88px] flex items-center justify-center gap-3 text-white font-black text-2xl rounded-2xl tracking-wide transition-all shadow-2xl"
                style={{ background: 'linear-gradient(135deg,#c2410c 0%,#ea580c 50%,#fb923c 100%)', boxShadow: '0 8px 40px rgba(249,115,22,0.35)' } as React.CSSProperties}>
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
  { icon: '📷', title: 'Camera Setup',     color: '#64748b',
    desc: 'Position your webcam so your arm is visible from shoulder to fingertips. A clear background helps tracking.' },
  { icon: '↔️', title: 'Aim',              color: '#f97316',
    desc: 'Move your hand left and right. Your wrist X position controls the arc angle — center = perfect 55° arc toward the basket.' },
  { icon: '📊', title: 'Power Meter',      color: '#fbbf24',
    desc: 'The orange power bar on the left oscillates automatically. Watch for the green "sweet zone" — that\'s the ideal power window.' },
  { icon: '✋', title: 'Shoot',            color: '#ef4444',
    desc: 'Raise your hand sharply above your head to release the ball. The shot fires with your current aim angle and the live power value.' },
  { icon: '🏀', title: 'Free Throws',      color: '#fb923c',
    desc: `You get ${MAX_SHOTS} free throw attempts per game. Each basket scores ${POINTS_PER_BASKET} points for a maximum of ${MAX_SHOTS * POINTS_PER_BASKET} points.` },
  { icon: '🏦', title: 'Bank Shot',        color: '#a78bfa',
    desc: 'The ball can bounce off the backboard and still score — a bank shot! Sometimes the off-angle adds up.' },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-4"
          style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#2d1200 40%,#0a0500 100%)' }}>

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
    id: 'easy', emoji: '🌱', label: 'Easy', tagline: 'Wide rim, slow meter',
    desc: `Generous ${DIFF_CONFIG.easy.scoreRadius}px scoring zone · slow power oscillation · great for warm-up`,
    stars: 1, grad: 'linear-gradient(135deg,#064e3b,#065f46)', glow: '#10b981', border: '#10b98140',
  },
  {
    id: 'normal', emoji: '🏀', label: 'Normal', tagline: 'Real free throw',
    desc: `Standard ${DIFF_CONFIG.normal.scoreRadius}px zone · medium-speed power · authentic challenge`,
    stars: 3, grad: 'linear-gradient(135deg,#78350f,#92400e)', glow: '#f97316', border: '#f9731640',
  },
  {
    id: 'hard', emoji: '🔥', label: 'Hard', tagline: 'Precision required',
    desc: `Tight ${DIFF_CONFIG.hard.scoreRadius}px zone · fast oscillation · only perfect shots score`,
    stars: 5, grad: 'linear-gradient(135deg,#7f1d1d,#991b1b)', glow: '#ef4444', border: '#ef444440',
  },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-6"
          style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#2d1200 40%,#0a0500 100%)' }}>

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
                    background: opt.grad,
                    border:     `1.5px solid ${opt.border}`,
                    boxShadow:  activeId === `diff-${opt.id}` ? `0 0 28px ${opt.glow}55` : 'none',
                  } as React.CSSProperties}>
                  <span className="text-5xl shrink-0">{opt.emoji}</span>
                  <div className="flex flex-col flex-1 items-start">
                    <div className="flex items-baseline gap-3">
                      <span className="text-white font-black text-2xl">{opt.label}</span>
                      <span className="text-white/50 text-sm font-medium">{opt.tagline}</span>
                    </div>
                    <span className="text-white/55 text-sm mt-0.5">{opt.desc}</span>
                  </div>
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

  const { shootFiredRef } = useGestureRefs();
  const handsRaw          = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef          = useRef(handsRaw);
  handsRef.current        = handsRaw;

  const loop = useCallback((ts: number) => {
    const rawDt = lastTimeRef.current ? ts - lastTimeRef.current : 16;
    const dtMs  = Math.min(rawDt, 50);
    lastTimeRef.current = ts;

    const raw     = handsRef.current;
    const gesture = deriveBasketGesture(raw.hands, shootFiredRef);

    let gs = gameStateRef.current;

    if (gs.phase !== 'game_over') {
      const newGs = stepGame(gs, dtMs, gesture);

      // Audio events
      if (newGs.audioTrigger !== null) {
        switch (newGs.audioTrigger) {
          case 'shoot':      playShoot();   break;
          case 'swish':      playSwish();   break;
          case 'bank':       playBank();    break;
          case 'miss_rim':   playMissRim(); break;
          case 'miss_air':   playMissAir(); break;
          case 'gameover':
            if (!scoreSentRef.current) playGameOver(newGs.score);
            break;
        }
      }

      // Post score exactly once when game ends
      if (newGs.phase === 'game_over' && gs.phase !== 'game_over' && !scoreSentRef.current) {
        scoreSentRef.current = true;
        const bonus = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 50 : 100;
        window.parent.postMessage(
          { type: 'GAME_COMPLETE', score: newGs.score + bonus },
          '*',
        );
      }

      gs = newGs;
      gameStateRef.current = gs;
      setDisplayState({ ...gs });
    }

    drawGame(canvasRef.current, gs, gesture.aimX, gesture.handDetected);
    rafRef.current = requestAnimationFrame(loop);
  }, [shootFiredRef, difficulty]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const handleRestart = () => {
    gameStateRef.current  = initialGameState(difficulty);
    scoreSentRef.current  = false;
    shootFiredRef.current = false;
    setDisplayState(gameStateRef.current);
  };

  const gs        = displayState;
  const anyHand   = handsRaw.leftDetected || handsRaw.rightDetected;
  const isGameOver = gs.phase === 'game_over';
  const shotsLeft  = MAX_SHOTS - gs.shotsTotal;

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden gap-2 px-2">

      {/* HUD row */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: CANVAS_W }}>
        <div className="flex items-center gap-3">
          <span className="text-orange-400 font-black text-2xl tabular-nums">{gs.score}</span>
          <span className="text-white/40 text-sm font-semibold">PTS</span>
        </div>
        <div className="text-white/30 text-xs text-center px-3">
          {gs.phase === 'game_over'
            ? '🏁 Game Over'
            : `Shot ${gs.shotsTotal + (gs.phase === 'aiming' ? 0 : 0) + 1} of ${MAX_SHOTS}`}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm font-semibold">LEFT</span>
          <span className="text-white/60 font-black text-2xl tabular-nums">{shotsLeft}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl shadow-2xl block"
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 110px)' }}
        />

        {/* No-hand prompt while aiming */}
        {!anyHand && !isGameOver && gs.phase === 'aiming' && (
          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}>
            <span className="text-5xl mb-3">✋</span>
            <p className="text-white font-bold text-lg">Show your hand!</p>
            <p className="text-white/50 text-sm mt-1">Hold your hand in front of the camera</p>
          </div>
        )}

        {/* Game over overlay */}
        {isGameOver && (
          <GameOverOverlay gs={gs} onRestart={handleRestart} onQuit={onQuit} />
        )}
      </div>

      {/* Controls strip */}
      <div className="flex items-center gap-4">
        <div className={`w-2.5 h-2.5 rounded-full border border-black/30 flex-shrink-0 ${anyHand ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className="text-white/35 text-xs">{anyHand ? 'Hand detected' : 'No hand'}</span>
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

      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
    </div>
  );
}

// ── Game Over overlay ─────────────────────────────────────────────────────────

function GameOverOverlay({ gs, onRestart, onQuit }: {
  gs: GameState; onRestart: () => void; onQuit: () => void;
}) {
  const pct   = (gs.score / (MAX_SHOTS * POINTS_PER_BASKET)) * 100;
  const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : pct >= 30 ? 1 : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '🏀' : pct >= 30 ? '😤' : '😞';
  const msg   = pct >= 80 ? 'Sharpshooter!' : pct >= 50 ? 'Good Game!' : pct >= 30 ? 'Keep Practising' : 'Better Luck Next Time';

  return (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="text-center flex flex-col items-center gap-4 px-8">
        <div className="text-6xl">{emoji}</div>
        <p className="font-black text-3xl text-white">{msg}</p>

        {/* Stars */}
        <div className="flex gap-2 items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="text-3xl" style={{ opacity: i < stars ? 1 : 0.18 }}>⭐</span>
          ))}
        </div>

        {/* Score breakdown */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-orange-400 font-black text-5xl tabular-nums">{gs.score}</span>
          <span className="text-white/40 text-sm uppercase tracking-widest">
            out of {MAX_SHOTS * POINTS_PER_BASKET} pts
          </span>
        </div>

        {/* Shot stats */}
        <div className="text-white/50 text-sm">
          {gs.score / POINTS_PER_BASKET} / {MAX_SHOTS} baskets
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={onRestart}
            className="px-8 py-2.5 font-bold text-white rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg,#c2410c,#ea580c)' }}>
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

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawGame(
  canvas:       HTMLCanvasElement | null,
  gs:           GameState,
  aimX:         number,
  handDetected: boolean,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Background: arena gradient ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.55, '#1c1010');
  bg.addColorStop(1, '#2a1500');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle spotlight from above the hoop
  const spot = ctx.createRadialGradient(HOOP_CX, 0, 20, HOOP_CX, 120, 280);
  spot.addColorStop(0, 'rgba(255,180,80,0.12)');
  spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Court floor ─────────────────────────────────────────────────────────
  const floorGrad = ctx.createLinearGradient(0, FLOOR_Y - 30, 0, CANVAS_H);
  floorGrad.addColorStop(0, '#7c3a1a');
  floorGrad.addColorStop(1, '#5c2a10');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);

  // Floor grain lines
  ctx.strokeStyle = 'rgba(255,180,60,0.06)';
  ctx.lineWidth   = 1;
  for (let x = 0; x < CANVAS_W; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // Court floor divider line
  ctx.strokeStyle = 'rgba(255,200,100,0.22)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(CANVAS_W, FLOOR_Y);
  ctx.stroke();

  // Free-throw lane markings (dashed key outline)
  ctx.strokeStyle = 'rgba(255,200,100,0.14)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(PLAYER_X - 30, FLOOR_Y - 2, 530, 2);   // free-throw line (just a line marker)
  ctx.setLineDash([]);

  // Free throw label
  ctx.fillStyle    = 'rgba(255,200,100,0.20)';
  ctx.font         = '11px monospace';
  ctx.textAlign    = 'center';
  ctx.fillText('FREE THROW', PLAYER_X + 80, FLOOR_Y - 8);

  // ── Backboard ───────────────────────────────────────────────────────────
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(BACKBOARD_X1 + 4, BACKBOARD_Y1 + 4, BACKBOARD_X2 - BACKBOARD_X1, BACKBOARD_Y2 - BACKBOARD_Y1);

  // Board body
  const boardGrad = ctx.createLinearGradient(BACKBOARD_X1, 0, BACKBOARD_X2, 0);
  boardGrad.addColorStop(0, '#e8e8e8');
  boardGrad.addColorStop(1, '#f5f5f5');
  ctx.fillStyle = boardGrad;
  ctx.fillRect(BACKBOARD_X1, BACKBOARD_Y1, BACKBOARD_X2 - BACKBOARD_X1, BACKBOARD_Y2 - BACKBOARD_Y1);

  // Orange target rectangle on backboard
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth   = 3;
  const targetX = BACKBOARD_X1 + 1;
  const targetY = HOOP_Y - 22;
  ctx.strokeRect(targetX, targetY, BACKBOARD_X2 - BACKBOARD_X1 - 2, 44);

  // ── Hoop support arm ────────────────────────────────────────────────────
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.moveTo(BACKBOARD_X1, HOOP_Y + 2);
  ctx.lineTo(RIM_RIGHT, HOOP_Y + 2);
  ctx.stroke();

  // ── Rim ─────────────────────────────────────────────────────────────────
  // Rim (two horizontal posts)
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(RIM_LEFT, HOOP_Y);
  ctx.lineTo(RIM_RIGHT, HOOP_Y);
  ctx.stroke();

  // Near rim post circle
  ctx.fillStyle = '#fb923c';
  ctx.beginPath();
  ctx.arc(RIM_LEFT, HOOP_Y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(RIM_RIGHT, HOOP_Y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Net (zigzag lines hanging below rim)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1.5;
  const netLeft  = RIM_LEFT;
  const netRight = RIM_RIGHT;
  const netTop   = HOOP_Y + 5;
  const netBot   = HOOP_Y + 38;
  const cols     = 6;
  const cw       = (netRight - netLeft) / cols;

  ctx.beginPath();
  // Top horizontals
  for (let i = 0; i <= cols; i++) {
    ctx.moveTo(netLeft + i * cw, netTop);
    ctx.lineTo(netLeft + i * cw + cw * 0.4, netBot * 0.55 + netTop * 0.45);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  // Bottom net shape
  ctx.moveTo(netLeft + cw * 0.5, netTop);
  for (let i = 0; i < cols; i++) {
    const x1 = netLeft + (i + 0.5) * cw;
    const x2 = netLeft + (i + 1) * cw;
    const x3 = netLeft + (i + 1.5) * cw;
    const yMid = netTop + (netBot - netTop) * 0.55;
    ctx.lineTo(x1, netTop);
    ctx.lineTo(x2, yMid);
    if (i < cols - 1) ctx.lineTo(x3, netTop);
  }
  ctx.stroke();

  // ── Player stick figure ──────────────────────────────────────────────────
  const px   = PLAYER_X;
  const footY = PLAYER_FOOT_Y;
  const headY = footY - 90;
  const waistY = footY - 55;
  const shoulderY = footY - 72;

  // Shadow on floor
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(px, footY, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jersey body
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(px - 12, shoulderY);
  ctx.lineTo(px + 12, shoulderY);
  ctx.lineTo(px + 10, waistY);
  ctx.lineTo(px - 10, waistY);
  ctx.closePath();
  ctx.fill();

  // Shorts
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(px - 10, waistY);
  ctx.lineTo(px + 10, waistY);
  ctx.lineTo(px + 11, footY - 30);
  ctx.lineTo(px - 11, footY - 30);
  ctx.closePath();
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(px - 5, footY - 30);
  ctx.lineTo(px - 6, footY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + 5, footY - 30);
  ctx.lineTo(px + 6, footY);
  ctx.stroke();

  // Arm (shooting arm raised when aiming, lower when resting)
  const aimAngle = gs.phase === 'aiming' ? aimAngleFromX(aimX) : aimAngleFromX(0.5);
  const armLen   = 28;
  const armEndX  = px + Math.cos(aimAngle) * armLen;
  const armEndY  = shoulderY - Math.sin(aimAngle) * armLen;

  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.moveTo(px, shoulderY);
  ctx.lineTo(armEndX, armEndY);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(px, headY, 11, 0, Math.PI * 2);
  ctx.fill();

  // ── Arc preview (only while aiming and hand detected) ───────────────────
  if (gs.phase === 'aiming' && handDetected) {
    const pts = previewArc(aimX, gs.powerValue);
    ctx.fillStyle = 'rgba(251,146,60,0.45)';
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Ball ────────────────────────────────────────────────────────────────
  const bx = gs.ball.x;
  const by = gs.ball.y;

  // Ball shadow (only near floor)
  if (by > FLOOR_Y - 80) {
    const shadowAlpha = Math.min((by - (FLOOR_Y - 80)) / 80, 0.5);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(bx, FLOOR_Y + 2, BALL_R * 0.9, BALL_R * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ball body
  const ballGrad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, BALL_R);
  ballGrad.addColorStop(0, '#fde68a');
  ballGrad.addColorStop(0.4, '#fb923c');
  ballGrad.addColorStop(1, '#9a3412');
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Ball seams
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(bx, by, BALL_R, -0.3, Math.PI + 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by, BALL_R, Math.PI - 0.3, Math.PI * 2 + 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by, BALL_R * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // ── Power meter (left side) ──────────────────────────────────────────────
  if (gs.phase === 'aiming') {
    const mX    = 28;
    const mY    = 80;
    const mH    = FLOOR_Y - 110;
    const mW    = 18;
    const power = gs.powerValue;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(mX - 2, mY - 2, mW + 4, mH + 4, 6);
    ctx.fill();

    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, 4);
    ctx.fill();

    // Fill (power bar grows from bottom)
    const fillH    = mH * power;
    const fillY    = mY + mH - fillH;
    const fillGrad = ctx.createLinearGradient(0, fillY, 0, mY + mH);
    fillGrad.addColorStop(0, '#ef4444');
    fillGrad.addColorStop(0.35, '#f97316');
    fillGrad.addColorStop(0.65, '#fbbf24');
    fillGrad.addColorStop(1, '#84cc16');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(mX, fillY, mW, fillH, 4);
    ctx.fill();

    // Sweet zone highlight (ideal power window)
    const sweetMin = 0.38;
    const sweetMax = 0.58;
    const sz_y1    = mY + mH * (1 - sweetMax);
    const sz_h     = mH * (sweetMax - sweetMin);
    ctx.fillStyle  = 'rgba(74,222,128,0.22)';
    ctx.strokeStyle = 'rgba(74,222,128,0.65)';
    ctx.lineWidth  = 1.5;
    ctx.beginPath();
    ctx.roundRect(mX, sz_y1, mW, sz_h, 2);
    ctx.fill();
    ctx.stroke();

    // Notch at ideal power (0.47)
    const idealY   = mY + mH * (1 - 0.47);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth  = 2;
    ctx.beginPath();
    ctx.moveTo(mX - 4, idealY);
    ctx.lineTo(mX + mW + 4, idealY);
    ctx.stroke();

    // Label
    ctx.fillStyle  = 'rgba(255,255,255,0.35)';
    ctx.font       = 'bold 9px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('PWR', mX + mW / 2, mY - 8);

    // Percentage
    ctx.fillStyle  = 'rgba(255,255,255,0.55)';
    ctx.font       = 'bold 10px monospace';
    ctx.fillText(`${Math.round(power * 100)}%`, mX + mW / 2, mY + mH + 14);
  }

  // ── Aim angle indicator (right of player, bottom) ───────────────────────
  if (gs.phase === 'aiming' && handDetected) {
    const indicatorX = PLAYER_X + 20;
    const indicatorY = PLAYER_FOOT_Y - 10;
    const radius     = 28;
    const angle      = aimAngleFromX(aimX);

    ctx.strokeStyle = 'rgba(251,146,60,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, radius, -Math.PI / 2, 0);
    ctx.stroke();

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(indicatorX, indicatorY);
    ctx.lineTo(
      indicatorX + Math.cos(angle) * radius,
      indicatorY - Math.sin(angle) * radius,
    );
    ctx.stroke();
  }

  // ── Result flash text ────────────────────────────────────────────────────
  if (gs.phase === 'result_score') {
    const alpha = Math.min(gs.phaseTimer / 300, 1);
    const txt   = gs.bankedShot ? '🏀 Bank Shot!' : '🏀 Swish!';
    ctx.globalAlpha = alpha;
    ctx.font        = 'bold 44px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#fbbf24';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur  = 20;
    ctx.fillText(txt, CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.font        = 'bold 28px sans-serif';
    ctx.fillStyle   = '#fff';
    ctx.fillText(`+${POINTS_PER_BASKET} pts`, CANVAS_W / 2, CANVAS_H / 2 + 22);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  if (gs.phase === 'result_miss') {
    const alpha = Math.min(gs.phaseTimer / 300, 1);
    ctx.globalAlpha = alpha;
    ctx.font        = 'bold 40px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#f87171';
    ctx.fillText('Miss!', CANVAS_W / 2, CANVAS_H / 2);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left';
}
