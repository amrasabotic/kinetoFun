import { useEffect, useRef, useState, useCallback } from 'react';
import { useHandTracking }          from './useHandTracking';
import { useMenuHand }              from './useMenuHand';
import { deriveBasketGesture, useGestureRefs } from './useGesture';
import {
  initialGameState, stepGame, previewArc,
  CANVAS_W, CANVAS_H, FLOOR_Y,
  PLAYER_X, PLAYER_FOOT_Y, BALL_START_X, BALL_START_Y, BALL_R,
  HOOP_CX, HOOP_Y, RIM_LEFT, RIM_RIGHT,
  BACKBOARD_X1, BACKBOARD_X2, BACKBOARD_Y1, BACKBOARD_Y2,
  DIFF_CONFIG, MAX_SHOTS, POINTS_PER_BASKET,
  aimAngleFromX, speedFromPower,
} from './gameLogic';
import type { GameState, Difficulty, BasketGestureInput } from './gameLogic';
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
      activeIdRef.current = hoveredId; setActiveId(hoveredId);
      dwellStartRef.current = hoveredId ? ts : null; setDwellProgress(0);
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
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 2} fill="none" stroke="rgba(251,146,60,0.3)" strokeWidth="2.5" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={9} fill="#fb923c" fillOpacity="0.95" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={4} fill="white" fillOpacity="0.9" />
          </svg>
        </div>
      )}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${hand.detected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white/70 text-xs font-medium">{hand.detected ? 'Hand detected' : 'No hand'}</span>
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
      <div className="absolute bottom-0 left-0 h-1 rounded-full transition-none pointer-events-none"
        style={{ width: `${isActive ? dwellProgress * 100 : 0}%`, background: 'linear-gradient(90deg,#f97316,#fbbf24)', opacity: isActive ? 1 : 0 }} />
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({ onPlay, onHow }: { onPlay: () => void; onHow: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6 relative"
          style={{ background: 'linear-gradient(160deg,#0d0500 0%,#1a0900 50%,#0a0300 100%)' }}>

          {/* Court floor glow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
            style={{ background: 'linear-gradient(to top,rgba(120,50,10,0.55) 0%,transparent 100%)' }} />
          {/* Spotlight */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 30%,rgba(251,146,60,0.08) 0%,transparent 100%)' }} />

          <div className="flex flex-col items-center gap-6 w-full max-w-md relative z-10">

            {/* Giant ball */}
            <div className="relative">
              <div className="text-[100px] leading-none select-none" style={{ filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.5))' }}>🏀</div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-5xl font-black tracking-tight leading-tight"
                style={{ background: 'linear-gradient(180deg,#ffffff 0%,#fb923c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gesture<br />Basketball
              </h1>
              <p className="text-orange-400/80 text-sm tracking-[0.25em] uppercase font-bold mt-2">
                Free Throw Challenge
              </p>
            </div>

            {/* Quick-ref gestures */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { icon: '↔️', label: 'Aim',    sub: 'Move hand left/right' },
                { icon: '⬇️', label: 'Ready',  sub: 'Hand below waist' },
                { icon: '🏀', label: 'Throw',  sub: 'Flick upward fast' },
              ].map(g => (
                <div key={g.label} className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.25)' }}>
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <div className="text-white font-bold text-xs tracking-wide uppercase">{g.label}</div>
                    <div className="text-white/45 text-[10px] mt-0.5 leading-tight">{g.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-white/30 text-xs text-center">Hover your hand over a button for 1 second to select</p>

            <div className="flex flex-col gap-3 w-full">
              <GestureBtn dwellId="play" activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full min-h-[80px] flex items-center justify-center gap-3 text-white font-black text-2xl rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#b45309 0%,#d97706 40%,#f97316 100%)', boxShadow: '0 6px 32px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.15)' } as React.CSSProperties}>
                <span>▶</span> PLAY
              </GestureBtn>
              <GestureBtn dwellId="how" activeId={activeId} dwellProgress={dwellProgress}
                onClick={onHow}
                className="w-full min-h-[64px] flex items-center justify-center text-white/80 font-bold text-lg rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' } as React.CSSProperties}>
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
  { icon: '📷', title: 'Camera Setup', color: '#94a3b8',
    desc: 'Position yourself so the camera sees your upper body — chest to above your head. Good lighting helps tracking.' },
  { icon: '↔️', title: '1 · Aim', color: '#fb923c',
    desc: 'Move your shooting hand left or right. The dotted arc on screen shows exactly where your shot will go in real-time.' },
  { icon: '⬇️', title: '2 · Get Ready', color: '#fbbf24',
    desc: 'Hold your hand in the lower half of the camera frame (below your waist height in the image). The green "READY" badge lights up.' },
  { icon: '🏀', title: '3 · Throw!', color: '#f97316',
    desc: 'Make a natural throwing motion — flick your wrist/arm upward quickly. The faster you throw, the more power the shot has.' },
  { icon: '📐', title: 'Power matters', color: '#a78bfa',
    desc: `A gentle throw = weak arc (undershoots). A natural medium throw = perfect arc. A hard throw = overshoots. Find your rhythm.` },
  { icon: '🏆', title: 'Scoring', color: '#4ade80',
    desc: `${MAX_SHOTS} shots per game, ${POINTS_PER_BASKET} pts each = ${MAX_SHOTS * POINTS_PER_BASKET} pts max. Consecutive baskets build a streak bonus.` },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center overflow-hidden px-5 py-4"
          style={{ background: 'linear-gradient(160deg,#0d0500 0%,#1a0900 50%,#0a0300 100%)' }}>
          <h2 className="text-3xl font-black text-white pt-2 pb-3 shrink-0">How to Play</h2>
          <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 w-full max-w-lg pb-2">
            {HOW_ITEMS.map(item => (
              <div key={item.title} className="flex gap-4 rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${item.color}18`, border: `1.5px solid ${item.color}40` }}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{item.title}</p>
                  <p className="text-white/55 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 w-full max-w-lg pt-2">
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full min-h-[64px] flex items-center justify-center text-white/80 font-bold text-lg rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' } as React.CSSProperties}>
              ← Back
            </GestureBtn>
          </div>
        </div>
      )}
    </MenuGestureLayer>
  );
}

// ── Difficulty Screen ─────────────────────────────────────────────────────────

const DIFF_OPTIONS: {
  id: Difficulty; emoji: string; label: string; tagline: string;
  bullets: string[]; stars: number; grad: string; border: string; glow: string;
}[] = [
  {
    id: 'easy', emoji: '🌱', label: 'Easy', tagline: 'Learn the motion',
    bullets: [`${DIFF_CONFIG.easy.scoreRadius}px scoring zone`, 'Wide rim tolerance', 'Great for warm-up'],
    stars: 1, grad: 'linear-gradient(135deg,#064e3b 0%,#0d7a5a 100%)',
    border: 'rgba(16,185,129,0.40)', glow: '#10b981',
  },
  {
    id: 'normal', emoji: '🏀', label: 'Normal', tagline: 'Real free throw',
    bullets: [`${DIFF_CONFIG.normal.scoreRadius}px scoring zone`, 'Authentic NBA feel', 'Aim + power both matter'],
    stars: 3, grad: 'linear-gradient(135deg,#7c2d12 0%,#c2410c 100%)',
    border: 'rgba(249,115,22,0.45)', glow: '#f97316',
  },
  {
    id: 'hard', emoji: '🔥', label: 'Hard', tagline: 'Precision only',
    bullets: [`${DIFF_CONFIG.hard.scoreRadius}px scoring zone`, 'Tight window', 'Perfect throws only score'],
    stars: 5, grad: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%)',
    border: 'rgba(239,68,68,0.45)', glow: '#ef4444',
  },
];

function DifficultyScreen({ onSelect, onBack }: { onSelect: (d: Difficulty) => void; onBack: () => void }) {
  return (
    <MenuGestureLayer>
      {({ hand: _h, activeId, dwellProgress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-5 py-6"
          style={{ background: 'linear-gradient(160deg,#0d0500 0%,#1a0900 50%,#0a0300 100%)' }}>
          <div className="w-full max-w-lg flex flex-col gap-4">
            <div className="text-center mb-1">
              <h2 className="text-4xl font-black text-white">Pick Difficulty</h2>
              <p className="text-white/40 text-sm mt-1">Hover to select</p>
            </div>
            {DIFF_OPTIONS.map(opt => (
              <GestureBtn key={opt.id} dwellId={`d-${opt.id}`} activeId={activeId} dwellProgress={dwellProgress}
                onClick={() => onSelect(opt.id)}
                className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl"
                style={{ background: opt.grad, border: `1.5px solid ${opt.border}`, boxShadow: activeId === `d-${opt.id}` ? `0 0 30px ${opt.glow}50` : 'none' } as React.CSSProperties}>
                <span className="text-5xl shrink-0">{opt.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-3">
                    <span className="text-white font-black text-xl">{opt.label}</span>
                    <span className="text-white/55 text-sm">{opt.tagline}</span>
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {opt.bullets.map(b => (
                      <span key={b} className="text-white/60 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.25)' }}>{b}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-base" style={{ opacity: i < opt.stars ? 1 : 0.15 }}>★</span>
                  ))}
                </div>
              </GestureBtn>
            ))}
            <GestureBtn dwellId="back" activeId={activeId} dwellProgress={dwellProgress}
              onClick={onBack}
              className="w-full min-h-[60px] flex items-center justify-center text-white/70 font-bold text-lg rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' } as React.CSSProperties}>
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
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const gsRef      = useRef<GameState>(initialGameState(difficulty));
  const [disp,     setDisp]     = useState<GameState>(gsRef.current);
  const rafRef     = useRef<number>(0);
  const lastTRef   = useRef<number>(0);
  const sentRef    = useRef(false);
  const trailRef   = useRef<Array<{ x: number; y: number; age: number }>>([]);

  const gestureRefs = useGestureRefs();
  const handsRaw    = useHandTracking(videoRef as React.RefObject<HTMLVideoElement>);
  const handsRef    = useRef(handsRaw);
  handsRef.current  = handsRaw;

  const loop = useCallback((ts: number) => {
    const rawDt = lastTRef.current ? ts - lastTRef.current : 16;
    const dtMs  = Math.min(rawDt, 50);
    lastTRef.current = ts;

    const raw     = handsRef.current;
    const gesture = deriveBasketGesture(raw.hands, gestureRefs);
    let gs = gsRef.current;

    if (gs.phase !== 'game_over') {
      const next = stepGame(gs, dtMs, gesture);

      if (next.audioTrigger !== null) {
        switch (next.audioTrigger) {
          case 'shoot':    playShoot();   break;
          case 'swish':    playSwish();   break;
          case 'bank':     playBank();    break;
          case 'miss_rim': playMissRim(); break;
          case 'miss_air': playMissAir(); break;
          case 'gameover': if (!sentRef.current) playGameOver(next.score); break;
        }
      }
      if (next.phase === 'game_over' && gs.phase !== 'game_over' && !sentRef.current) {
        sentRef.current = true;
        const bonus = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 50 : 100;
        window.parent.postMessage({ type: 'GAME_COMPLETE', score: next.score + bonus }, '*');
      }

      // Update ball trail
      if (next.phase === 'in_flight') {
        trailRef.current.push({ x: next.ball.x, y: next.ball.y, age: 0 });
        trailRef.current = trailRef.current
          .map(t => ({ ...t, age: t.age + 1 }))
          .filter(t => t.age < 10);
      } else {
        trailRef.current = [];
      }

      gs = next;
      gsRef.current = gs;
      setDisp({ ...gs });
    }

    drawGame(canvasRef.current, gs, gesture, trailRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [gestureRefs, difficulty]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const handleRestart = () => {
    gsRef.current = initialGameState(difficulty);
    sentRef.current = false;
    trailRef.current = [];
    gestureRefs.shootFiredRef.current = false;
    gestureRefs.peakYRef.current      = 0.7;
    gestureRefs.baseYRef.current      = 0.7;
    setDisp(gsRef.current);
  };

  const gs       = disp;
  const anyHand  = handsRaw.leftDetected || handsRaw.rightDetected;
  const isOver   = gs.phase === 'game_over';
  const shotsDone = gs.shotsTotal;

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-hidden gap-2 px-2"
      style={{ background: '#0a0400' }}>

      {/* Top HUD */}
      <div className="flex items-center justify-between w-full px-1" style={{ maxWidth: CANVAS_W }}>
        {/* Score */}
        <div className="flex items-center gap-2">
          <div className="text-orange-400 font-black text-3xl leading-none tabular-nums"
            style={{ textShadow: '0 0 20px rgba(249,115,22,0.6)' }}>
            {gs.score}
          </div>
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">pts</span>
            {gs.streak >= 2 && (
              <span className="text-yellow-400 text-[10px] font-bold">{gs.streak}× 🔥</span>
            )}
          </div>
        </div>

        {/* Shot dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: MAX_SHOTS }).map((_, i) => {
            const used = i < shotsDone;
            const cur  = i === shotsDone && gs.phase === 'aiming';
            return (
              <div key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:       cur ? 12 : 9,
                  height:      cur ? 12 : 9,
                  background:  used ? '#f97316' : cur ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                  boxShadow:   cur ? '0 0 8px #fbbf24' : 'none',
                }} />
            );
          })}
        </div>

        {/* Difficulty badge */}
        <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{
            background: difficulty === 'easy' ? 'rgba(16,185,129,0.2)' : difficulty === 'normal' ? 'rgba(249,115,22,0.2)' : 'rgba(239,68,68,0.2)',
            color:      difficulty === 'easy' ? '#34d399' : difficulty === 'normal' ? '#fb923c' : '#f87171',
            border:     `1px solid ${difficulty === 'easy' ? 'rgba(16,185,129,0.35)' : difficulty === 'normal' ? 'rgba(249,115,22,0.35)' : 'rgba(239,68,68,0.35)'}`,
          }}>
          {DIFF_CONFIG[difficulty].label}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ maxWidth: CANVAS_W }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          className="block rounded-xl shadow-2xl"
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 108px)', border: '1px solid rgba(255,255,255,0.06)' }} />

        {!anyHand && !isOver && gs.phase === 'aiming' && (
          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <span className="text-5xl mb-3">✋</span>
            <p className="text-white font-black text-xl">Show your hand!</p>
            <p className="text-white/55 text-sm mt-1">Hold it in front of the camera</p>
          </div>
        )}

        {isOver && <GameOverOverlay gs={gs} onRestart={handleRestart} onQuit={onQuit} />}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center gap-4 pb-1">
        <div className={`w-2 h-2 rounded-full ${anyHand ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className="text-white/35 text-xs">{anyHand ? 'Hand detected' : 'No hand detected'}</span>
        <button onClick={handleRestart}
          className="px-3 py-1 rounded-lg text-white/55 text-xs font-semibold transition-all hover:text-white/80"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
          Restart
        </button>
        <button onClick={onQuit}
          className="px-3 py-1 rounded-lg text-white/55 text-xs font-semibold transition-all hover:text-white/80"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
          Quit
        </button>
      </div>

      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
    </div>
  );
}

// ── Game Over overlay ─────────────────────────────────────────────────────────

function GameOverOverlay({ gs, onRestart, onQuit }: { gs: GameState; onRestart: () => void; onQuit: () => void }) {
  const pct    = gs.score / (MAX_SHOTS * POINTS_PER_BASKET);
  const stars  = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : pct >= 0.3 ? 1 : 0;
  const emoji  = pct >= 0.8 ? '🏆' : pct >= 0.5 ? '🏀' : pct >= 0.3 ? '😤' : '😞';
  const msg    = pct >= 0.8 ? 'Sharpshooter!' : pct >= 0.5 ? 'Solid Game!' : pct >= 0.3 ? 'Keep Practising' : 'Keep Shooting';
  const made   = gs.score / POINTS_PER_BASKET;

  return (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(8px)' }}>
      <div className="text-center flex flex-col items-center gap-5 px-8 py-6 rounded-3xl w-full max-w-xs"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>

        <div className="text-6xl">{emoji}</div>
        <p className="font-black text-2xl text-white">{msg}</p>

        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="text-3xl transition-all" style={{ opacity: i < stars ? 1 : 0.15, filter: i < stars ? 'drop-shadow(0 0 8px #fbbf24)' : 'none' }}>⭐</span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-black text-5xl tabular-nums"
            style={{ color: '#fb923c', textShadow: '0 0 24px rgba(249,115,22,0.5)' }}>
            {gs.score}
          </span>
          <span className="text-white/40 text-xs uppercase tracking-widest">/ {MAX_SHOTS * POINTS_PER_BASKET} pts</span>
        </div>

        <div className="px-4 py-2 rounded-xl w-full text-center"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <span className="text-white/70 text-base font-semibold">{made} / {MAX_SHOTS}</span>
          <span className="text-white/40 text-sm"> baskets made</span>
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={onRestart}
            className="flex-1 py-3 font-black text-white text-base rounded-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#b45309,#f97316)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
            Play Again
          </button>
          <button onClick={onQuit}
            className="flex-1 py-3 font-bold text-white/70 text-base rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}>
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────

type Trail = Array<{ x: number; y: number; age: number }>;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as unknown as Record<string, unknown>).roundRect === 'function') {
    (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawGame(
  canvas:  HTMLCanvasElement | null,
  gs:      GameState,
  gesture: BasketGestureInput,
  trail:   Trail,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── 1. Arena background ────────────────────────────────────────────────────
  {
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0,   '#07091a');
    bg.addColorStop(0.4, '#120600');
    bg.addColorStop(1,   '#1c0800');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Spotlight beam from above hoop
  {
    const spot = ctx.createRadialGradient(HOOP_CX - 10, 0, 0, HOOP_CX - 10, 0, 380);
    spot.addColorStop(0,   'rgba(255,185,70,0.18)');
    spot.addColorStop(0.5, 'rgba(255,140,30,0.06)');
    spot.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ── 2. Crowd silhouettes ───────────────────────────────────────────────────
  for (let row = 0; row < 4; row++) {
    const rowY   = 22 + row * 22;
    const alpha  = 0.10 + row * 0.04;
    const headR  = 5 + row * 1.2;
    const spacing = 16 - row;
    ctx.fillStyle = `rgba(60,25,8,${alpha})`;
    for (let xi = -10; xi < CANVAS_W + 10; xi += spacing) {
      const jx = xi + Math.sin(row * 3.7 + xi * 0.15) * 4;
      ctx.beginPath();
      ctx.arc(jx, rowY, headR, Math.PI, 0);
      ctx.fill();
      // shoulders
      ctx.beginPath();
      ctx.moveTo(jx - headR * 1.4, rowY + headR * 0.3);
      ctx.lineTo(jx + headR * 1.4, rowY + headR * 0.3);
      ctx.lineTo(jx + headR * 1.2, rowY + headR * 2.5);
      ctx.lineTo(jx - headR * 1.2, rowY + headR * 2.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── 3. Court floor ─────────────────────────────────────────────────────────
  {
    const floorGrad = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, CANVAS_H);
    floorGrad.addColorStop(0, '#8b4513');
    floorGrad.addColorStop(0.5, '#6b3410');
    floorGrad.addColorStop(1, '#3d1c08');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(255,200,100,0.055)';
    ctx.lineWidth   = 1;
    for (let xi = 0; xi < CANVAS_W; xi += 22) {
      ctx.beginPath();
      ctx.moveTo(xi, FLOOR_Y);
      ctx.lineTo(xi + 6, CANVAS_H);
      ctx.stroke();
    }

    // Floor shine
    {
      const shine = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 40);
      shine.addColorStop(0, 'rgba(255,220,120,0.12)');
      shine.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, FLOOR_Y, CANVAS_W, 40);
    }
  }

  // Floor divider line
  ctx.strokeStyle = 'rgba(255,210,100,0.30)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CANVAS_W, FLOOR_Y); ctx.stroke();

  // Key/paint area (from player to under hoop)
  {
    const keyGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, CANVAS_H);
    keyGrad.addColorStop(0, 'rgba(255,120,30,0.09)');
    keyGrad.addColorStop(1, 'rgba(255,80,10,0.04)');
    ctx.fillStyle = keyGrad;
    ctx.fillRect(PLAYER_X - 45, FLOOR_Y, RIM_LEFT - (PLAYER_X - 45) + 40, CANVAS_H - FLOOR_Y);
  }

  // Free throw line
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(PLAYER_X - 20, FLOOR_Y); ctx.lineTo(PLAYER_X - 20, FLOOR_Y + 4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(PLAYER_X + 80, FLOOR_Y); ctx.lineTo(PLAYER_X + 80, CANVAS_H); ctx.stroke();

  // "FREE THROW" text on floor
  ctx.fillStyle   = 'rgba(255,255,255,0.18)';
  ctx.font        = 'bold 11px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('FREE THROW LINE', PLAYER_X + 30, FLOOR_Y + 16);

  // ── 4. Hoop support structure ───────────────────────────────────────────────
  // Vertical pole from floor to rim
  {
    const poleGrad = ctx.createLinearGradient(BACKBOARD_X1 + 4, 0, BACKBOARD_X2 + 4, 0);
    poleGrad.addColorStop(0, '#374151');
    poleGrad.addColorStop(1, '#6b7280');
    ctx.fillStyle = poleGrad;
    ctx.fillRect(BACKBOARD_X1 + 3, HOOP_Y + 5, 8, FLOOR_Y - HOOP_Y - 5);
  }

  // Horizontal support arm from pole to near rim
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(BACKBOARD_X1 + 7, HOOP_Y - 2);
  ctx.lineTo(RIM_LEFT + 2, HOOP_Y - 2);
  ctx.stroke();

  // ── 5. Backboard ───────────────────────────────────────────────────────────
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(BACKBOARD_X1 + 5, BACKBOARD_Y1 + 5, BACKBOARD_X2 - BACKBOARD_X1, BACKBOARD_Y2 - BACKBOARD_Y1);

  // Board
  {
    const boardG = ctx.createLinearGradient(BACKBOARD_X1, 0, BACKBOARD_X2, 0);
    boardG.addColorStop(0, '#e8e8e8');
    boardG.addColorStop(1, '#f4f4f4');
    ctx.fillStyle = boardG;
    ctx.fillRect(BACKBOARD_X1, BACKBOARD_Y1, BACKBOARD_X2 - BACKBOARD_X1, BACKBOARD_Y2 - BACKBOARD_Y1);
  }

  // Black outline
  ctx.strokeStyle = '#111';
  ctx.lineWidth   = 2;
  ctx.strokeRect(BACKBOARD_X1, BACKBOARD_Y1, BACKBOARD_X2 - BACKBOARD_X1, BACKBOARD_Y2 - BACKBOARD_Y1);

  // Orange target box
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth   = 3;
  ctx.strokeRect(BACKBOARD_X1 + 1, HOOP_Y - 24, BACKBOARD_X2 - BACKBOARD_X1 - 2, 48);

  // ── 6. Rim ─────────────────────────────────────────────────────────────────
  // Rim glow
  {
    const rimGlow = ctx.createRadialGradient(HOOP_CX, HOOP_Y, 0, HOOP_CX, HOOP_Y, 55);
    rimGlow.addColorStop(0, 'rgba(249,115,22,0.28)');
    rimGlow.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = rimGlow;
    ctx.beginPath();
    ctx.ellipse(HOOP_CX, HOOP_Y, 55, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rim bar (orange, thick)
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth   = 7;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(RIM_LEFT, HOOP_Y); ctx.lineTo(RIM_RIGHT, HOOP_Y); ctx.stroke();

  // Rim highlight
  ctx.strokeStyle = 'rgba(255,200,100,0.50)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(RIM_LEFT + 4, HOOP_Y - 2); ctx.lineTo(RIM_RIGHT - 4, HOOP_Y - 2); ctx.stroke();

  // Near post (player-facing, brighter = closer)
  ctx.fillStyle = '#fb923c';
  ctx.beginPath(); ctx.arc(RIM_LEFT, HOOP_Y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(RIM_LEFT, HOOP_Y, 7, 0, Math.PI * 2); ctx.stroke();

  // Far post (backboard-facing, darker)
  ctx.fillStyle = '#c2410c';
  ctx.beginPath(); ctx.arc(RIM_RIGHT, HOOP_Y, 6, 0, Math.PI * 2); ctx.fill();

  // ── 7. Net ─────────────────────────────────────────────────────────────────
  {
    const netLeft  = RIM_LEFT + 2;
    const netRight = RIM_RIGHT - 2;
    const netTop   = HOOP_Y + 7;
    const netBot   = HOOP_Y + 42;
    const cols     = 8;
    const cw       = (netRight - netLeft) / cols;

    ctx.strokeStyle = 'rgba(255,255,255,0.50)';
    ctx.lineWidth   = 1.2;

    // Vertical strings
    for (let c = 0; c <= cols; c++) {
      const tx1 = netLeft + c * cw;
      // Converge slightly inward toward bottom
      const inset = (c / cols - 0.5) * -10;
      const tx2   = netLeft + (netRight - netLeft) / 2 + inset + (c - cols / 2) * cw * 0.65;
      ctx.beginPath(); ctx.moveTo(tx1, netTop); ctx.lineTo(tx2, netBot); ctx.stroke();
    }

    // Horizontal strings (3 levels)
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    for (let row = 0; row < 3; row++) {
      const ry   = netTop + (netBot - netTop) * (row + 1) / 3;
      const shrink = row * 4;
      ctx.beginPath();
      ctx.moveTo(netLeft + shrink, ry);
      ctx.lineTo(netRight - shrink, ry);
      ctx.stroke();
    }
  }

  // ── 8. Player (stick figure) ────────────────────────────────────────────────
  {
    const px    = PLAYER_X;
    const footY = PLAYER_FOOT_Y;
    const headY = footY - 92;
    const hipY  = footY - 50;
    const shouldY = footY - 72;

    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.beginPath(); ctx.ellipse(px, footY + 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Shoes
    ctx.fillStyle = '#1f2937';
    ctx.beginPath(); ctx.ellipse(px - 6, footY, 8, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 6, footY, 8, 4, 0.2, 0, Math.PI * 2); ctx.fill();

    // Socks (white strip)
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(px - 9, footY - 10, 6, 10);
    ctx.fillRect(px + 3, footY - 10, 6, 10);

    // Shorts (orange with white stripes)
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.moveTo(px - 13, hipY);
    ctx.lineTo(px + 13, hipY);
    ctx.lineTo(px + 11, footY - 12);
    ctx.lineTo(px - 11, footY - 12);
    ctx.closePath();
    ctx.fill();
    // Shorts stripe
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(px - 10, hipY + 8); ctx.lineTo(px - 8, footY - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 10, hipY + 8); ctx.lineTo(px + 8, footY - 14); ctx.stroke();

    // Jersey body
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(px - 14, shouldY);
    ctx.lineTo(px + 14, shouldY);
    ctx.lineTo(px + 12, hipY);
    ctx.lineTo(px - 12, hipY);
    ctx.closePath();
    ctx.fill();
    // Jersey number
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font      = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('23', px, shouldY + 18);

    // Legs
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth   = 7;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(px - 5, hipY + 5); ctx.lineTo(px - 7, footY - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 5, hipY + 5); ctx.lineTo(px + 7, footY - 10); ctx.stroke();

    // Shooting arm (points at aim angle)
    const aimAngle = gs.phase === 'aiming' ? gs.aimAngle : aimAngleFromX(gesture.aimX);
    const armLen   = 32;
    const armEndX  = px + Math.cos(aimAngle) * armLen;
    const armEndY  = shouldY - Math.sin(aimAngle) * armLen;

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth   = 7;
    ctx.beginPath(); ctx.moveTo(px + 5, shouldY - 5); ctx.lineTo(armEndX, armEndY); ctx.stroke();

    // Non-shooting arm (out to side for balance)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth   = 6;
    ctx.beginPath(); ctx.moveTo(px - 5, shouldY - 2); ctx.lineTo(px - 26, shouldY + 10); ctx.stroke();

    // Head
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath(); ctx.arc(px, headY, 12, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(px + 4, headY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px - 4, headY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── 9. Arc preview (aiming phase) ──────────────────────────────────────────
  if (gs.phase === 'aiming' && gesture.handDetected) {
    const pts = previewArc(gesture.aimX, 0.47);  // use ideal power for preview
    ctx.save();
    for (let i = 0; i < pts.length; i++) {
      const p       = pts[i];
      const alpha   = 0.65 - p.t * 0.55;
      const radius  = 4 - p.t * 2.5;
      const r = Math.round(255);
      const g = Math.round(160 - p.t * 60);
      const b = Math.round(20);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(radius, 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Hoop target glow
    const cfg  = DIFF_CONFIG[gs.difficulty];
    const glow = ctx.createRadialGradient(HOOP_CX, HOOP_Y, 0, HOOP_CX, HOOP_Y, cfg.scoreRadius);
    glow.addColorStop(0, 'rgba(74,222,128,0.25)');
    glow.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(HOOP_CX, HOOP_Y, cfg.scoreRadius, 0, Math.PI * 2); ctx.fill();
  }

  // ── 10. Ball (with trail) ───────────────────────────────────────────────────
  // Trail (in flight only)
  if (gs.phase === 'in_flight') {
    for (const t of trail) {
      const a = Math.max(0, 0.6 - t.age * 0.07);
      const r2 = BALL_R * Math.max(0.3, 1 - t.age * 0.09);
      ctx.globalAlpha = a;
      ctx.fillStyle   = '#f97316';
      ctx.beginPath(); ctx.arc(t.x, t.y, r2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Ball body
  {
    const bx = gs.ball.x;
    const by = gs.ball.y;

    // Shadow near floor
    if (by > FLOOR_Y - 100) {
      const shadowAmt = Math.min((by - (FLOOR_Y - 100)) / 100, 0.55);
      ctx.fillStyle = `rgba(0,0,0,${shadowAmt})`;
      ctx.beginPath(); ctx.ellipse(bx, FLOOR_Y + 3, BALL_R * 0.85, BALL_R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }

    const ballG = ctx.createRadialGradient(bx - 4, by - 4, 1, bx, by, BALL_R);
    ballG.addColorStop(0,   '#fde68a');
    ballG.addColorStop(0.35,'#fb923c');
    ballG.addColorStop(0.7, '#ea580c');
    ballG.addColorStop(1,   '#7c2d12');
    ctx.fillStyle = ballG;
    ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, Math.PI * 2); ctx.fill();

    // Seam lines
    ctx.strokeStyle = 'rgba(0,0,0,0.60)';
    ctx.lineWidth   = 1.8;
    const spin = gs.phase === 'in_flight' ? gs.ball.vx * 0.05 : 0;
    ctx.beginPath(); ctx.arc(bx, by, BALL_R, -0.4 + spin, Math.PI + 0.4 + spin); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, BALL_R, Math.PI - 0.4 + spin, Math.PI * 2 + 0.4 + spin); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, BALL_R * 0.68, 0 + spin, Math.PI * 2 + spin); ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,200,0.45)';
    ctx.beginPath(); ctx.ellipse(bx - 4, by - 4, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── 11. Throw indicator (aiming state) ────────────────────────────────────
  if (gs.phase === 'aiming' && gesture.handDetected) {
    const charge = gesture.chargeRatio;
    const isReady = gesture.wristY > 0.52;

    // Charge bar (bottom of canvas, under player)
    const barX = PLAYER_X - 30;
    const barY = CANVAS_H - 18;
    const barW = 60;
    const barH = 8;

    // Track background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); rr(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 5); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); rr(ctx, barX, barY, barW, barH, 3); ctx.fill();

    // Fill
    if (charge > 0) {
      const fillG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fillG.addColorStop(0, '#f97316');
      fillG.addColorStop(1, '#fbbf24');
      ctx.fillStyle = fillG;
      ctx.beginPath(); rr(ctx, barX, barY, barW * charge, barH, 3); ctx.fill();
    }

    // Status label
    ctx.font      = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    if (isReady) {
      ctx.fillStyle = '#4ade80';
      ctx.fillText('READY — flick up!', barX + barW / 2, barY - 5);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('lower hand to ready', barX + barW / 2, barY - 5);
    }
  }

  // ── 12. Score / result overlays ────────────────────────────────────────────
  if (gs.phase === 'result_score') {
    const fade   = Math.min(gs.phaseTimer / 350, 1);
    const rise   = (1 - gs.phaseTimer / 1600) * 30;
    ctx.save();
    ctx.globalAlpha = fade;

    // Glow burst
    const burst = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2 - rise - 20, 0, CANVAS_W / 2, CANVAS_H / 2 - rise - 20, 120);
    burst.addColorStop(0, 'rgba(251,191,36,0.30)');
    burst.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = burst;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const txt = gs.bankedShot ? '🏀 Bank Shot!' : '🏀 Swish!';
    ctx.font      = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    // Shadow/glow
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 24;
    ctx.fillStyle   = '#fbbf24';
    ctx.fillText(txt, CANVAS_W / 2, CANVAS_H / 2 - 16 - rise);
    ctx.shadowBlur  = 0;
    ctx.font        = 'bold 30px sans-serif';
    ctx.fillStyle   = '#ffffff';
    ctx.fillText(`+${POINTS_PER_BASKET} pts${gs.streak >= 2 ? ` 🔥×${gs.streak}` : ''}`, CANVAS_W / 2, CANVAS_H / 2 + 26 - rise);
    ctx.restore();
  }

  if (gs.phase === 'result_miss') {
    const fade = Math.min(gs.phaseTimer / 350, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font        = 'bold 46px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#f87171';
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16;
    ctx.fillText('Miss!', CANVAS_W / 2, CANVAS_H / 2);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // ── 13. On-canvas HUD strip (shot info overlay) ────────────────────────────
  if (gs.phase !== 'game_over') {
    const shotNum = gs.shotsTotal + (gs.phase === 'aiming' ? 1 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.beginPath(); rr(ctx, CANVAS_W - 110, 10, 100, 32, 8); ctx.fill();
    ctx.font      = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Shot ${shotNum} / ${MAX_SHOTS}`, CANVAS_W - 60, 31);
  }

  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}
