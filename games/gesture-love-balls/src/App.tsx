import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Matter from 'matter-js';
import { useMediaPipe, useMenuHand } from './hooks/useMediaPipe';
import { LEVELS, type LevelDef } from './levels/index';
import { isFist, isThumbsUp, smooth, type Landmark } from './utils/gestures';
import {
  initAudio, playDraw, playVictory, playHeart,
  playStarSparkle, playFailure, playReset, playInkEmpty,
} from './utils/audio';
import {
  GAME_W, GAME_H, BALL_R, LINE_W, MIN_DRAW_DIST,
  PINCH_THRESHOLD, PINCH_CONFIRM_MS, PINCH_RELEASE_MS,
  FIST_RESET_MS, THUMBSUP_MS, DWELL_MS, CURSOR_R,
  GRAVITY_Y, BALL_RESTITUTION, BALL_FRICTION,
  LINE_FRICTION, LINE_RESTITUTION, PLATFORM_FRICTION,
  VICTORY_DIST, DEATH_Y, STAR3_THRESHOLD, STAR2_THRESHOLD,
  SCORE_PER_STAR, TOTAL_LEVELS,
} from './utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen  = 'landing' | 'howtoplay' | 'levelselect' | 'game';
type Phase   = 'idle' | 'rolling' | 'win' | 'fail' | 'paused';

interface Vec2 { x: number; y: number }

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; type: 'heart' | 'dot' | 'confetti' | 'star';
  size: number; rot: number; rotV: number;
}

interface SaveData {
  unlockedLevels: number[];
  stars:   Record<number, number>;
  bestInk: Record<number, number>;
}

interface GS {
  // physics
  engine:  Matter.Engine;
  ballA:   Matter.Body;
  ballB:   Matter.Body;
  drawn:   Matter.Body[];
  spikes:  Matter.Body[];
  moving:  { body: Matter.Body; ox: number; oy: number; axis: 'x'|'y'; range: number; period: number; phase: number }[];
  rotating:{ body: Matter.Body; speed: number; angle: number }[];
  level:   LevelDef;
  // drawing
  path:     Vec2[];      // live stroke points
  strokes:  Vec2[][];   // completed strokes (for rendering)
  inkUsed:  number;
  drawing:  boolean;    // currently mid-stroke
  inkWarn:  boolean;
  // cursor (game pixels)
  cx: number; cy: number;
  // gesture timers
  pinchMs:   number;
  releaseMs: number;
  thumbMs:   number;
  fistMs:    number;
  // state
  phase:     Phase;
  launched:  boolean;
  wonSent:   boolean;
  // visual
  particles: Particle[];
  shakeX: number; shakeY: number;
  blinkA: number; blinkB: number;
  elapsed: number;
}

// ── Persistence ───────────────────────────────────────────────────────────────

const SAVE_KEY = 'glb_save_v1';
function loadSave(): SaveData {
  try { const r = localStorage.getItem(SAVE_KEY); if (r) return JSON.parse(r); } catch {}
  return { unlockedLevels: [1], stars: {}, bestInk: {} };
}
function writeSave(d: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcStars(used: number, limit: number) {
  const rem = 1 - used / limit;
  return rem >= STAR3_THRESHOLD ? 3 : rem >= STAR2_THRESHOLD ? 2 : 1;
}

function d2(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }

function spawnP(
  list: Particle[], cx: number, cy: number,
  type: Particle['type'], n: number, colors: string[],
) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
    list.push({
      x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      life: 1, maxLife: 0.8 + Math.random() * 0.9,
      color: colors[Math.floor(Math.random() * colors.length)],
      type, size: 6 + Math.random() * 10,
      rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.18,
    });
  }
}

function tickP(list: Particle[], dt: number) {
  const d = dt / 1000;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx * dt * 0.05; p.y += p.vy * dt * 0.05;
    p.vy += 0.04 * dt * 0.05;
    p.rot += p.rotV;
    p.life -= d / p.maxLife;
    if (p.life <= 0) list.splice(i, 1);
  }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: 'blue' | 'pink', blinkT: number,
) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  const gc = color === 'blue' ? 'rgba(96,165,250,' : 'rgba(244,114,182,';
  glow.addColorStop(0, gc + '0.35)'); glow.addColorStop(1, gc + '0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();

  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.1);
  if (color === 'blue') {
    g.addColorStop(0, '#93c5fd'); g.addColorStop(0.5, '#3b82f6'); g.addColorStop(1, '#1e3a8a');
  } else {
    g.addColorStop(0, '#f9a8d4'); g.addColorStop(0.5, '#ec4899'); g.addColorStop(1, '#831843');
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = color === 'blue' ? 'rgba(30,58,138,0.5)' : 'rgba(131,24,67,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.3, r * 0.28, r * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();

  const eyeH = blinkT > 0.85 ? 1 : (1 - blinkT) * r * 0.18 + 1;
  const eyeW = r * 0.16;
  const ey = y - r * 0.08, eo = r * 0.28;
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.ellipse(x - eo, ey, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + eo, ey, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
  if (blinkT < 0.85) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x - eo + eyeW * 0.3, ey - eyeH * 0.3, eyeW * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eo + eyeW * 0.3, ey - eyeH * 0.3, eyeW * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r * 0.28, r * 0.22, 0.15, Math.PI - 0.15); ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) {
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.type === 'heart') {
      ctx.font = `${p.size * (p.life * 0.8 + 0.2)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('❤', 0, 0);
    } else if (p.type === 'star') {
      ctx.font = `${p.size * 0.7}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 0, 0);
    } else if (p.type === 'confetti') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, pinching: boolean, inkFrac: number) {
  const r = CURSOR_R;
  ctx.save();
  ctx.strokeStyle = pinching ? 'rgba(168,85,247,0.9)' : 'rgba(255,255,255,0.7)';
  ctx.lineWidth   = pinching ? 3 : 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  if (inkFrac > 0) {
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + inkFrac * Math.PI * 2);
    ctx.stroke();
  }
  const inner = ctx.createRadialGradient(x, y, 0, x, y, 8);
  inner.addColorStop(0, pinching ? '#c084fc' : 'rgba(255,255,255,0.9)');
  inner.addColorStop(1, pinching ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.3)');
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── DwellLayer — menu gesture handler ────────────────────────────────────────

const CURSOR_R_MENU = 28;

function DwellLayer({ children }: {
  children: (props: {
    hand: ReturnType<typeof useMenuHand>;
    active: string | null;
    progress: number;
  }) => React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand     = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef  = useRef(hand); handRef.current = hand;
  const [active,   setActive]   = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const activeRef  = useRef<string | null>(null);
  const rafRef     = useRef(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActive(null); setProgress(0);
      dwellStart.current = null; activeRef.current = null;
      rafRef.current = requestAnimationFrame(loop); return;
    }
    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;
    let hov: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom)
        hov = (el as HTMLElement).dataset.dwellId!;
    });
    if (hov !== activeRef.current) {
      activeRef.current = hov; setActive(hov);
      dwellStart.current = hov ? ts : null; setProgress(0);
    } else if (hov && dwellStart.current !== null) {
      const p = Math.min((ts - dwellStart.current) / DWELL_MS, 1);
      setProgress(p);
      if (p >= 1) {
        (document.querySelector(`[data-dwell-id="${hov}"]`) as HTMLElement | null)?.click();
        dwellStart.current = null; setActive(null); setProgress(0); activeRef.current = null;
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
      {children({ hand, active, progress })}
      {hand.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{
            left: hand.x * window.innerWidth - CURSOR_R_MENU,
            top:  hand.y * window.innerHeight - CURSOR_R_MENU,
            width: CURSOR_R_MENU * 2, height: CURSOR_R_MENU * 2,
          }}>
          <svg width={CURSOR_R_MENU * 2} height={CURSOR_R_MENU * 2}>
            <circle cx={CURSOR_R_MENU} cy={CURSOR_R_MENU} r={CURSOR_R_MENU - 3}
              fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="2.5" />
            <circle cx={CURSOR_R_MENU} cy={CURSOR_R_MENU} r={9}
              fill="#a855f7" fillOpacity="0.92" />
            <circle cx={CURSOR_R_MENU} cy={CURSOR_R_MENU} r={4}
              fill="white" fillOpacity="0.9" />
          </svg>
        </div>
      )}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${hand.detected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white/70 text-xs font-medium">
          {hand.detected ? 'Hand detected' : 'No hand'}
        </span>
      </div>
    </div>
  );
}

function DBtn({
  id, active, progress, onClick, className = '', style, children,
}: {
  id: string; active: string | null; progress: number;
  onClick: () => void; className?: string;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  const isAct = active === id;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button data-dwell-id={id}
        onClick={(e) => { if (e.isTrusted) return; onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none', ...style }}
        className={`${className} ${isAct ? 'brightness-110 scale-[1.02]' : ''} transition-all duration-150 relative`}>
        {children}
      </button>
      <div className="absolute bottom-0 left-0 h-1 rounded-full pointer-events-none"
        style={{
          width: `${isAct ? progress * 100 : 0}%`,
          background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
          opacity: isAct ? 1 : 0,
        }} />
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({ onPlay, onHow, save }: {
  onPlay: () => void; onHow: () => void; save: SaveData;
}) {
  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  return (
    <DwellLayer>
      {({ active, progress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6"
          style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1e0b3b 50%,#0f0a1e 100%)' }}>
          {['💜', '💙', '🩷', '❤️'].map((h, i) => (
            <div key={i} className="pointer-events-none absolute text-4xl opacity-20 select-none"
              style={{ left: `${15 + i * 22}%`, top: `${8 + i * 12}%`, animation: `floatUp ${3 + i * 0.7}s ease-in-out infinite alternate` }}>
              {h}
            </div>
          ))}
          <div className="flex flex-col items-center gap-5 w-full max-w-md relative z-10">
            <div className="text-7xl select-none" style={{ filter: 'drop-shadow(0 0 28px rgba(168,85,247,0.7))', animation: 'floatUp 2s ease-in-out infinite alternate' }}>
              🩷💙
            </div>
            <h1 className="text-5xl font-black text-center leading-tight"
              style={{ background: 'linear-gradient(180deg,#ffffff 0%,#c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Love Balls
            </h1>
            <p className="text-purple-300 text-sm tracking-widest uppercase font-bold">
              Gesture Physics Puzzle
            </p>
            {totalStars > 0 && (
              <div className="px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(168,85,247,0.22)', border: '1.5px solid rgba(168,85,247,0.55)' }}>
                <span className="text-yellow-300">⭐ {totalStars}</span>
                <span className="text-white/70"> stars earned</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 w-full text-center">
              {[
                { icon: '🤏', label: 'Draw', sub: 'Pinch to draw' },
                { icon: '👍', label: 'Launch', sub: 'Thumbs up' },
                { icon: '✊', label: 'Reset', sub: 'Hold fist' },
              ].map(g => (
                <div key={g.label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(168,85,247,0.35)' }}>
                  <span className="text-2xl">{g.icon}</span>
                  <div className="text-white font-bold text-xs">{g.label}</div>
                  <div className="text-purple-300 text-[11px]">{g.sub}</div>
                </div>
              ))}
            </div>
            <p className="text-purple-200/70 text-xs font-medium">
              Cursor follows your index fingertip · hover a button 1 s to select
            </p>
            <div className="flex flex-col gap-3 w-full">
              <DBtn id="play" active={active} progress={progress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full min-h-[80px] flex items-center justify-center gap-3 text-white font-black text-2xl rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#6d28d9 0%,#a855f7 50%,#7c3aed 100%)', boxShadow: '0 8px 32px rgba(168,85,247,0.55), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                ▶ &nbsp;PLAY
              </DBtn>
              <DBtn id="how" active={active} progress={progress} onClick={onHow}
                className="w-full min-h-[60px] flex items-center justify-center text-white font-bold text-lg rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                How to Play
              </DBtn>
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── How to Play ───────────────────────────────────────────────────────────────

const HOW_ITEMS = [
  { icon: '📷', title: 'Camera Setup', color: '#94a3b8', desc: 'Allow camera access. Make sure your hand is clearly visible and well-lit.' },
  { icon: '✋', title: '1 · Move Cursor', color: '#a855f7', desc: 'The cursor always follows your index fingertip. Move your hand to aim.' },
  { icon: '🤏', title: '2 · Draw Lines', color: '#ec4899', desc: 'Pinch your thumb and index finger together to draw. The line follows your fingertip while pinching. Release to finish the stroke — it becomes a physics surface.' },
  { icon: '👍', title: '3 · Launch Balls', color: '#22c55e', desc: 'Hold a thumbs-up for 0.6 s to release the balls. A green ring grows around your cursor while charging.' },
  { icon: '🎯', title: '4 · Connect Balls', color: '#3b82f6', desc: 'Draw ramps and bridges so both balls roll together and touch. Plan your path before launching!' },
  { icon: '✊', title: 'Reset', color: '#f97316', desc: 'Hold a fist for 1 second to erase all drawings and re-freeze the balls.' },
  { icon: '🖊️', title: 'Ink Meter', color: '#6366f1', desc: 'Each level has limited ink. Draw efficiently — using less ink earns more stars.' },
  { icon: '🏆', title: 'Scoring', color: '#fbbf24', desc: '70 %+ ink remaining = ⭐⭐⭐ (300 pts) · 30–70 % = ⭐⭐ · <30 % = ⭐' },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <DwellLayer>
      {({ active, progress }) => (
        <div className="h-screen flex flex-col items-center overflow-hidden px-5 py-4"
          style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1e0b3b 50%,#0f0a1e 100%)' }}>
          <h2 className="text-3xl font-black text-white pt-2 pb-3 shrink-0">How to Play</h2>
          <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 w-full max-w-lg pb-2">
            {HOW_ITEMS.map(item => (
              <div key={item.title} className="flex gap-4 rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${item.color}44` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${item.color}22`, border: `2px solid ${item.color}66` }}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{item.title}</p>
                  <p className="text-purple-200/80 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 w-full max-w-lg pt-2">
            <DBtn id="how-back" active={active} progress={progress} onClick={onBack}
              className="w-full min-h-[60px] flex items-center justify-center text-white font-bold text-lg rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              ← Back
            </DBtn>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Level Select ──────────────────────────────────────────────────────────────

function LevelSelectScreen({ save, onSelect, onBack }: {
  save: SaveData; onSelect: (id: number) => void; onBack: () => void;
}) {
  return (
    <DwellLayer>
      {({ active, progress }) => (
        <div className="h-screen flex flex-col overflow-hidden px-4 py-4"
          style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1e0b3b 50%,#0f0a1e 100%)' }}>
          <div className="flex items-center gap-3 shrink-0 mb-3">
            <DBtn id="ls-back" active={active} progress={progress} onClick={onBack}
              className="px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              ← Back
            </DBtn>
            <h2 className="text-2xl font-black text-white">Choose Level</h2>
          </div>
          <div className="overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-5 gap-3 pb-3">
              {LEVELS.map(lv => {
                const unlocked = save.unlockedLevels.includes(lv.id);
                const lvStars  = save.stars[lv.id] ?? 0;
                const isAct    = active === `lv-${lv.id}`;
                return (
                  <DBtn key={lv.id} id={`lv-${lv.id}`} active={active} progress={progress}
                    onClick={() => unlocked && onSelect(lv.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                    style={{
                      background: unlocked ? (isAct ? 'rgba(168,85,247,0.30)' : 'rgba(168,85,247,0.15)') : 'rgba(255,255,255,0.05)',
                      border: unlocked ? `2px solid rgba(168,85,247,${isAct ? '0.8' : '0.45'})` : '2px solid rgba(255,255,255,0.12)',
                      opacity: unlocked ? 1 : 0.5,
                    }}>
                    <span className="text-lg font-black text-white">{lv.id}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <span key={s} className="text-xs" style={{ opacity: s <= lvStars ? 1 : 0.2 }}>⭐</span>
                      ))}
                    </div>
                    {!unlocked && <span className="text-xs text-white/40">🔒</span>}
                  </DBtn>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── HUD button (game screen) ──────────────────────────────────────────────────

function HBtn({ hid, ha, hp, children, onClick, className = '', style }: {
  hid: string; ha: string | null; hp: number;
  children: React.ReactNode; onClick: () => void;
  className?: string; style?: React.CSSProperties;
}) {
  const isAct = ha === hid;
  return (
    <div className="relative overflow-hidden rounded-xl">
      <button data-hud-id={hid}
        onClick={(e) => { if (e.isTrusted) return; onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none', ...style }}
        className={`${className} ${isAct ? 'brightness-125' : ''} transition-all`}>
        {children}
      </button>
      <div className="absolute bottom-0 left-0 h-0.5 pointer-events-none"
        style={{ width: `${isAct ? hp * 100 : 0}%`, background: '#a855f7' }} />
    </div>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function GameScreen({ levelId, onComplete, onQuit, onNext }: {
  levelId: number;
  onComplete: (stars: number, score: number) => void;
  onQuit: () => void;
  onNext: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const handRef   = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);

  // React state — only for HUD/overlay rendering
  const [phase,    setPhase]    = useState<Phase>('idle');
  const [inkPct,   setInkPct]   = useState(1);
  const [stars,    setStars]    = useState(0);
  const [score,    setScore]    = useState(0);
  const [launched, setLaunched] = useState(false);
  const [scale,    setScale]    = useState(1);

  // HUD dwell state
  const [hudActive, setHudActive] = useState<string | null>(null);
  const [hudProg,   setHudProg]   = useState(0);

  // All mutable game state — never triggers re-renders
  const gsRef   = useRef<GS | null>(null);
  const rafRef  = useRef(0);
  const hudRaf  = useRef(0);
  const lastT   = useRef(0);

  // ── Build level ──────────────────────────────────────────────────────────
  function buildLevel(lv: LevelDef): GS {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: GRAVITY_Y, scale: 0.001 } });
    const world  = engine.world;

    const wallOpts = { isStatic: true, friction: PLATFORM_FRICTION, label: 'wall' };
    Matter.Composite.add(world, [
      Matter.Bodies.rectangle(-25, GAME_H / 2, 50, GAME_H, wallOpts),
      Matter.Bodies.rectangle(GAME_W + 25, GAME_H / 2, 50, GAME_H, wallOpts),
    ]);

    const platOpts = { isStatic: true, friction: PLATFORM_FRICTION, restitution: 0.1, label: 'platform' };
    for (const p of lv.platforms ?? []) {
      Matter.Composite.add(world, Matter.Bodies.rectangle(
        p.x + p.w / 2, p.y + p.h / 2, p.w, p.h,
        { ...platOpts, angle: ((p.angle ?? 0) * Math.PI) / 180 },
      ));
    }

    const spikes: Matter.Body[] = [];
    for (const s of lv.spikes ?? []) {
      const b = Matter.Bodies.rectangle(
        s.x + s.w / 2, s.y + s.h / 2, s.w, s.h,
        { isStatic: true, isSensor: true, label: 'spike' },
      );
      spikes.push(b);
      Matter.Composite.add(world, b);
    }

    const moving: GS['moving'] = [];
    for (const mb of lv.movingBlocks ?? []) {
      const b = Matter.Bodies.rectangle(
        mb.x + mb.w / 2, mb.y + mb.h / 2, mb.w, mb.h,
        { isStatic: true, friction: PLATFORM_FRICTION, label: 'moving' },
      );
      Matter.Composite.add(world, b);
      moving.push({ body: b, ox: mb.x + mb.w / 2, oy: mb.y + mb.h / 2, axis: mb.axis, range: mb.range, period: mb.period, phase: mb.phase ?? 0 });
    }

    const rotating: GS['rotating'] = [];
    for (const rb of lv.rotatingBeams ?? []) {
      const b = Matter.Bodies.rectangle(rb.x, rb.y, rb.w, rb.h,
        { isStatic: true, friction: PLATFORM_FRICTION, label: 'rotating' },
      );
      Matter.Composite.add(world, b);
      rotating.push({ body: b, speed: rb.speed, angle: rb.startAngle ?? 0 });
    }

    const bOpts = { isStatic: true, friction: BALL_FRICTION, restitution: BALL_RESTITUTION, density: 0.002 };
    const ballA = Matter.Bodies.circle(lv.balls[0].x, lv.balls[0].y, BALL_R, { ...bOpts, label: 'ball_blue' });
    const ballB = Matter.Bodies.circle(lv.balls[1].x, lv.balls[1].y, BALL_R, { ...bOpts, label: 'ball_pink' });
    Matter.Composite.add(world, [ballA, ballB]);

    return {
      engine, ballA, ballB, drawn: [], spikes, moving, rotating, level: lv,
      path: [], strokes: [], inkUsed: 0, drawing: false, inkWarn: false,
      cx: GAME_W / 2, cy: GAME_H / 2,
      pinchMs: 0, releaseMs: 0, thumbMs: 0, fistMs: 0,
      phase: 'idle', launched: false, wonSent: false,
      particles: [], shakeX: 0, shakeY: 0,
      blinkA: 0, blinkB: 0.4, elapsed: 0,
    };
  }

  // ── Solidify drawn path into physics ─────────────────────────────────────
  function solidify(path: Vec2[]) {
    const gs = gsRef.current;
    if (!gs || path.length < 2) return;
    const bodies: Matter.Body[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 2) continue;
      const body = Matter.Bodies.rectangle(
        (a.x + b.x) / 2, (a.y + b.y) / 2, len + 2, LINE_W * 2,
        { angle: Math.atan2(dy, dx), isStatic: true, friction: LINE_FRICTION, restitution: LINE_RESTITUTION, label: 'drawn' },
      );
      bodies.push(body);
    }
    Matter.Composite.add(gs.engine.world, bodies);
    gs.drawn.push(...bodies);
    gs.strokes.push([...path]);
  }

  // ── Clear all drawn lines ──────────────────────────────────────────────────
  function clearDrawings() {
    const gs = gsRef.current;
    if (!gs) return;
    gs.drawn.forEach(b => Matter.Composite.remove(gs.engine.world, b));
    gs.drawn   = [];
    gs.strokes = [];
    gs.inkUsed = 0;
    gs.inkWarn = false;
  }

  // ── Launch balls ──────────────────────────────────────────────────────────
  function doLaunch() {
    const gs = gsRef.current;
    if (!gs || gs.launched) return;
    Matter.Body.setStatic(gs.ballA, false);
    Matter.Body.setStatic(gs.ballB, false);
    gs.launched = true;
    gs.phase    = 'rolling';
    setLaunched(true);
    setPhase('rolling');
  }

  // ── Reset level ───────────────────────────────────────────────────────────
  function doReset() {
    const gs = gsRef.current;
    if (!gs) return;
    clearDrawings();
    const lv = gs.level;
    Matter.Body.setStatic(gs.ballA, true);
    Matter.Body.setPosition(gs.ballA, { x: lv.balls[0].x, y: lv.balls[0].y });
    Matter.Body.setVelocity(gs.ballA, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(gs.ballA, 0);
    Matter.Body.setStatic(gs.ballB, true);
    Matter.Body.setPosition(gs.ballB, { x: lv.balls[1].x, y: lv.balls[1].y });
    Matter.Body.setVelocity(gs.ballB, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(gs.ballB, 0);
    gs.path    = [];
    gs.drawing = false;
    gs.pinchMs = gs.releaseMs = gs.thumbMs = gs.fistMs = 0;
    gs.phase   = 'idle';
    gs.launched = false;
    gs.wonSent = false;
    gs.particles = [];
    gs.shakeX = gs.shakeY = 0;
    setPhase('idle');
    setLaunched(false);
    setInkPct(1);
    playReset();
  }

  // ── Render one frame ──────────────────────────────────────────────────────
  function renderFrame(gs: GS) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sx = gs.shakeX ? (Math.random() - 0.5) * gs.shakeX | 0 : 0;
    const sy = gs.shakeY ? (Math.random() - 0.5) * gs.shakeY | 0 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-30, -30, GAME_W + 60, GAME_H + 60);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, GAME_H);
    bg.addColorStop(0, '#0c0820'); bg.addColorStop(1, '#1a0835');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(168,85,247,0.05)'; ctx.lineWidth = 1;
    for (let gx = 0; gx <= GAME_W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GAME_H); ctx.stroke(); }
    for (let gy = 0; gy <= GAME_H; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GAME_W, gy); ctx.stroke(); }
    ctx.shadowBlur = 0;

    // Platforms, moving blocks, rotating beams — render via Matter.js vertices
    for (const b of Matter.Composite.allBodies(gs.engine.world)) {
      const lbl = b.label;
      if (lbl === 'wall' || lbl === 'ball_blue' || lbl === 'ball_pink' || lbl === 'spike' || lbl === 'drawn') continue;
      const vs = b.vertices;
      ctx.save();
      const isRot = lbl === 'rotating';
      const isMov = lbl === 'moving';
      ctx.shadowColor = isRot ? '#ea580c' : '#7c3aed';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = isRot ? '#7c2d12' : (isMov ? '#1e1b4b' : '#2e1065');
      ctx.strokeStyle = isRot ? '#f97316' : (isMov ? '#818cf8' : '#7c3aed');
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(vs[0].x, vs[0].y);
      for (let i = 1; i < vs.length; i++) ctx.lineTo(vs[i].x, vs[i].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // Spikes — triangle visualization
    ctx.save();
    ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
    for (const sb of gs.spikes) {
      const w = sb.bounds.max.x - sb.bounds.min.x;
      const h = sb.bounds.max.y - sb.bounds.min.y;
      const cnt = Math.max(1, Math.floor(w / 20));
      const sw = w / cnt;
      for (let i = 0; i < cnt; i++) {
        ctx.beginPath();
        ctx.moveTo(sb.bounds.min.x + i * sw, sb.bounds.max.y);
        ctx.lineTo(sb.bounds.min.x + i * sw + sw / 2, sb.bounds.min.y);
        ctx.lineTo(sb.bounds.min.x + (i + 1) * sw, sb.bounds.max.y);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    // Completed strokes (smooth paths)
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of gs.strokes) {
      if (stroke.length < 2) continue;
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(168,85,247,0.45)'; ctx.lineWidth = LINE_W * 2.2;
      ctx.beginPath(); ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = '#9333ea'; ctx.lineWidth = LINE_W * 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Live drawing path (preview)
    if (gs.path.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(192,132,252,0.55)'; ctx.lineWidth = LINE_W * 2.2;
      ctx.beginPath(); ctx.moveTo(gs.path[0].x, gs.path[0].y);
      for (let i = 1; i < gs.path.length; i++) ctx.lineTo(gs.path[i].x, gs.path[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = LINE_W * 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Frozen indicator — dashed ring around balls while idle
    if (!gs.launched) {
      ctx.save();
      ctx.strokeStyle = 'rgba(147,197,253,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(gs.ballA.position.x, gs.ballA.position.y, BALL_R + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(gs.ballB.position.x, gs.ballB.position.y, BALL_R + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Balls
    drawBall(ctx, gs.ballA.position.x, gs.ballA.position.y, BALL_R, gs.level.balls[0].color ?? 'blue', gs.blinkA % 1);
    drawBall(ctx, gs.ballB.position.x, gs.ballB.position.y, BALL_R, gs.level.balls[1].color ?? 'pink', gs.blinkB % 1);

    // Particles
    drawParticles(ctx, gs.particles);

    // Cursor (only when hand detected)
    if (handRef.current.detected) {
      const pinching = gs.pinchMs > 50;
      drawCursor(ctx, gs.cx, gs.cy, pinching, gs.inkUsed / gs.level.inkLimit);
    }

    // Thumbs-up charge ring (green)
    if (gs.thumbMs > 50 && !gs.launched) {
      const fp = Math.min(gs.thumbMs / THUMBSUP_MS, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(52,211,153,${fp * 0.9})`; ctx.lineWidth = 5;
      ctx.shadowColor = '#34d399'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(gs.cx, gs.cy, CURSOR_R + 28, -Math.PI / 2, -Math.PI / 2 + fp * Math.PI * 2);
      ctx.stroke(); ctx.restore();
    }

    // Fist charge ring (orange)
    if (gs.fistMs > 100) {
      const fp = Math.min(gs.fistMs / FIST_RESET_MS, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(249,115,22,${fp * 0.8})`; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(gs.cx, gs.cy, CURSOR_R + 14, -Math.PI / 2, -Math.PI / 2 + fp * Math.PI * 2);
      ctx.stroke(); ctx.restore();
    }

    ctx.restore();
  }

  // ── Main game loop ────────────────────────────────────────────────────────
  const gameLoop = useCallback((ts: number) => {
    const dt = Math.min(lastT.current ? ts - lastT.current : 16, 50);
    lastT.current = ts;

    const gs = gsRef.current;
    if (!gs) { rafRef.current = requestAnimationFrame(gameLoop); return; }

    const hand = handRef.current;
    const lm   = hand.landmarks as Landmark[];

    // ── Cursor: always index fingertip ──────────────────────────────────────
    if (hand.detected && lm.length >= 9) {
      gs.cx = smooth(gs.cx, (1 - lm[8].x) * GAME_W, 0.25);
      gs.cy = smooth(gs.cy, lm[8].y * GAME_H, 0.25);
    }

    // ── Pinch detection ─────────────────────────────────────────────────────
    const pinching = hand.detected && lm.length >= 5 &&
      Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < PINCH_THRESHOLD;

    if (pinching) { gs.pinchMs += dt; gs.releaseMs = 0; }
    else          { gs.releaseMs += dt; gs.pinchMs = 0; }

    const drawActive = gs.pinchMs >= PINCH_CONFIRM_MS;

    // ── Thumbs-up: launch ───────────────────────────────────────────────────
    const thumbing = hand.detected && lm.length >= 21 && isThumbsUp(lm);
    if (thumbing && !gs.launched && gs.phase !== 'win' && gs.phase !== 'fail') {
      gs.thumbMs += dt;
      if (gs.thumbMs >= THUMBSUP_MS) { gs.thumbMs = 0; doLaunch(); }
    } else {
      gs.thumbMs = 0;
    }

    // ── Fist: reset ─────────────────────────────────────────────────────────
    const fisting = hand.detected && lm.length >= 21 && isFist(lm);
    if (fisting && gs.phase !== 'win' && gs.phase !== 'fail') {
      gs.fistMs += dt;
      if (gs.fistMs >= FIST_RESET_MS) { gs.fistMs = 0; doReset(); rafRef.current = requestAnimationFrame(gameLoop); return; }
    } else {
      gs.fistMs = 0;
    }

    gs.elapsed += dt;

    // ── Win/fail: only animate ──────────────────────────────────────────────
    if (gs.phase === 'win' || gs.phase === 'fail') {
      if (gs.phase === 'win' && Math.random() < 0.12) {
        const mx = (gs.ballA.position.x + gs.ballB.position.x) / 2;
        const my = (gs.ballA.position.y + gs.ballB.position.y) / 2;
        spawnP(gs.particles, mx, my, 'heart', 2, ['#f472b6', '#a855f7', '#ec4899']);
        spawnP(gs.particles, mx, my, 'confetti', 2, ['#fbbf24', '#34d399', '#60a5fa']);
      }
      tickP(gs.particles, dt);
      gs.shakeX *= 0.85; gs.shakeY *= 0.85;
      gs.blinkA  = (gs.blinkA + dt * 0.0008) % 1.1;
      gs.blinkB  = (gs.blinkB + dt * 0.0007) % 1.1;
      renderFrame(gs);
      rafRef.current = requestAnimationFrame(gameLoop); return;
    }

    // ── Paused ──────────────────────────────────────────────────────────────
    if (gs.phase === 'paused') {
      tickP(gs.particles, dt);
      renderFrame(gs);
      rafRef.current = requestAnimationFrame(gameLoop); return;
    }

    // ── Drawing ─────────────────────────────────────────────────────────────
    const inkLimit = gs.level.inkLimit;
    const inkLeft  = Math.max(0, inkLimit - gs.inkUsed);

    if (drawActive && !gs.drawing) {
      gs.drawing = true;
      gs.path    = [{ x: gs.cx, y: gs.cy }];
    }

    if (gs.drawing && drawActive && inkLeft > 0) {
      const last = gs.path[gs.path.length - 1];
      const dd   = d2(last, { x: gs.cx, y: gs.cy });
      if (dd >= MIN_DRAW_DIST) {
        gs.inkUsed += Math.min(dd, inkLeft);
        gs.path.push({ x: gs.cx, y: gs.cy });
        if (Math.random() < 0.4) playDraw();
        if (gs.inkUsed >= inkLimit * 0.95 && !gs.inkWarn) {
          playInkEmpty(); gs.inkWarn = true;
        }
      }
    }

    // Pinch released long enough → solidify
    if (gs.drawing && !drawActive && gs.releaseMs >= PINCH_RELEASE_MS) {
      if (gs.path.length >= 2) solidify(gs.path);
      gs.path    = [];
      gs.drawing = false;
    }

    setInkPct(Math.max(0, 1 - gs.inkUsed / inkLimit));

    // ── Physics step — always run to keep broadphase fresh ────────────────────
    // (static balls don't move; running idle keeps engine state healthy so the
    //  first post-launch update doesn't crash on stale broadphase data)
    if (gs.launched) {
      const t = gs.elapsed / 1000;
      for (const mo of gs.moving) {
        const off = Math.sin((t / (mo.period / 1000) + mo.phase) * Math.PI * 2) * mo.range;
        Matter.Body.setPosition(mo.body, { x: mo.axis === 'x' ? mo.ox + off : mo.ox, y: mo.axis === 'y' ? mo.oy + off : mo.oy });
        Matter.Body.setVelocity(mo.body, { x: 0, y: 0 });
      }
      for (const rb of gs.rotating) {
        rb.angle += rb.speed * (dt / 1000);
        Matter.Body.setAngle(rb.body, (rb.angle * Math.PI) / 180);
        Matter.Body.setAngularVelocity(rb.body, 0);
      }
    }
    Matter.Engine.update(gs.engine, dt);
    if (gs.launched) {

      // Win check
      if (!gs.wonSent) {
        const dd = d2(gs.ballA.position, gs.ballB.position);
        if (dd < VICTORY_DIST) {
          const s  = calcStars(gs.inkUsed, inkLimit);
          const sc = s * SCORE_PER_STAR;
          gs.phase   = 'win';
          gs.wonSent = true;
          setPhase('win'); setStars(s); setScore(sc);
          const mx = (gs.ballA.position.x + gs.ballB.position.x) / 2;
          const my = (gs.ballA.position.y + gs.ballB.position.y) / 2;
          spawnP(gs.particles, mx, my, 'heart',    20, ['#f472b6', '#a855f7', '#ec4899', '#fb7185']);
          spawnP(gs.particles, mx, my, 'confetti', 25, ['#fbbf24', '#34d399', '#60a5fa', '#f9a8d4']);
          gs.shakeX = 7; gs.shakeY = 6;
          playVictory(); playHeart();
          setTimeout(() => playStarSparkle(s), 500);
          window.parent?.postMessage({ type: 'GAME_COMPLETE', score: sc }, '*');
          onComplete(s, sc);
        }
      }

      // Fail check
      if (gs.phase === 'rolling') {
        const aFall = gs.ballA.position.y > DEATH_Y;
        const bFall = gs.ballB.position.y > DEATH_Y;
        let spiked = false;
        for (const sb of gs.spikes) {
          const chk = (ball: Matter.Body) => {
            const dx = ball.position.x - sb.position.x;
            const dy = ball.position.y - sb.position.y;
            const hw = (sb.bounds.max.x - sb.bounds.min.x) / 2 + BALL_R;
            const hh = (sb.bounds.max.y - sb.bounds.min.y) / 2 + BALL_R;
            return Math.abs(dx) < hw && Math.abs(dy) < hh;
          };
          if (chk(gs.ballA) || chk(gs.ballB)) { spiked = true; break; }
        }
        if ((aFall || bFall || spiked) && !gs.wonSent) {
          gs.phase = 'fail';
          setPhase('fail');
          gs.shakeX = 12; gs.shakeY = 12;
          playFailure();
        }
      }
    }

    // Blink timers
    gs.blinkA = (gs.blinkA + dt * 0.0008) % 1.1;
    gs.blinkB = (gs.blinkB + dt * 0.0007) % 1.1;

    tickP(gs.particles, dt);
    gs.shakeX *= 0.85; gs.shakeY *= 0.85;
    if (Math.abs(gs.shakeX) < 0.1) gs.shakeX = 0;
    if (Math.abs(gs.shakeY) < 0.1) gs.shakeY = 0;

    renderFrame(gs);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── HUD dwell loop ────────────────────────────────────────────────────────
  const hudDwellStart = useRef<number | null>(null);
  const hudActiveRef  = useRef<string | null>(null);

  const hudLoop = useCallback((ts: number) => {
    const hand = handRef.current;
    const gs   = gsRef.current;
    const canvas = canvasRef.current;
    if (!hand.detected || !gs || !canvas) {
      setHudActive(null); setHudProg(0);
      hudDwellStart.current = null; hudActiveRef.current = null;
      hudRaf.current = requestAnimationFrame(hudLoop); return;
    }

    // Convert game-pixel cursor to screen coordinates
    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + (gs.cx / GAME_W) * rect.width;
    const screenY = rect.top  + (gs.cy / GAME_H) * rect.height;

    let hov: string | null = null;
    document.querySelectorAll('[data-hud-id]').forEach(el => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom)
        hov = (el as HTMLElement).dataset.hudId!;
    });

    if (hov !== hudActiveRef.current) {
      hudActiveRef.current = hov; setHudActive(hov);
      hudDwellStart.current = hov ? ts : null; setHudProg(0);
    } else if (hov && hudDwellStart.current !== null) {
      const p = Math.min((ts - hudDwellStart.current) / DWELL_MS, 1);
      setHudProg(p);
      if (p >= 1) {
        (document.querySelector(`[data-hud-id="${hov}"]`) as HTMLElement | null)?.click();
        hudDwellStart.current = null; setHudActive(null); setHudProg(0); hudActiveRef.current = null;
      }
    }
    hudRaf.current = requestAnimationFrame(hudLoop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scale canvas to window ────────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const sc = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H, 1);
      setScale(sc);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const lv = LEVELS.find(l => l.id === levelId);
    if (!lv) return;
    gsRef.current = buildLevel(lv);
    lastT.current = 0;
    setPhase('idle'); setInkPct(1); setStars(0); setScore(0); setLaunched(false);
    rafRef.current = requestAnimationFrame(gameLoop);
    hudRaf.current = requestAnimationFrame(hudLoop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(hudRaf.current);
    };
  }, [levelId, gameLoop, hudLoop]); // eslint-disable-line react-hooks/exhaustive-deps


  const lv = LEVELS.find(l => l.id === levelId);

  return (
    <div className="flex flex-col items-center justify-center h-screen"
      style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1e0b3b 100%)' }}>
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {/* ── Top HUD ── */}
      <div className="flex items-center justify-between w-full px-3 pb-2"
        style={{ maxWidth: GAME_W * scale }}>
        <div className="flex items-center gap-2">
          <HBtn ha={hudActive} hp={hudProg} hid="quit" onClick={onQuit}
            className="px-3 py-1.5 rounded-lg text-white/80 text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.2)' }}>
            ✕ Quit
          </HBtn>
          <span className="text-white/60 text-xs font-bold">{lv?.name ?? `Level ${levelId}`}</span>
        </div>

        {/* Ink meter */}
        <div className="flex items-center gap-1.5">
          <span className="text-purple-300 text-xs">🖊️</span>
          <div className="w-28 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-none"
              style={{
                width: `${inkPct * 100}%`,
                background: inkPct > 0.4 ? '#a855f7' : inkPct > 0.15 ? '#f59e0b' : '#ef4444',
              }} />
          </div>
          <span className="text-white/60 text-xs">{Math.round(inkPct * 100)}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <HBtn ha={hudActive} hp={hudProg} hid="reset" onClick={doReset}
            className="px-3 py-1.5 rounded-lg text-white/80 text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.2)' }}>
            ↺ Reset
          </HBtn>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative" style={{ width: GAME_W * scale, height: GAME_H * scale }}>
        <canvas ref={canvasRef} width={GAME_W} height={GAME_H}
          style={{ width: GAME_W * scale, height: GAME_H * scale, display: 'block', borderRadius: 12 }} />

        {/* ── Idle overlay: launch prompt ── */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none" style={{ borderRadius: 12 }}>
            <div className="flex items-center gap-3">
              <div className="text-white/60 text-sm font-medium animate-pulse">Draw a path, then</div>
              <HBtn ha={hudActive} hp={hudProg} hid="launch" onClick={doLaunch}
                className="pointer-events-auto px-5 py-2.5 rounded-2xl text-white font-black text-base"
                style={{
                  background: 'linear-gradient(135deg,#059669,#34d399)',
                  boxShadow: '0 4px 20px rgba(52,211,153,0.5)',
                  pointerEvents: 'auto',
                }}>
                🚀 Launch!
              </HBtn>
            </div>
            <p className="text-white/40 text-xs mt-2">or hold 👍 thumbs-up</p>
          </div>
        )}

        {/* ── Win overlay ── */}
        {phase === 'win' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', borderRadius: 12 }}>
            <div className="text-6xl animate-bounce">🩷💙</div>
            <h2 className="text-4xl font-black text-white" style={{ textShadow: '0 0 30px #a855f7' }}>
              They Met! 💕
            </h2>
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <span key={s} className="text-3xl" style={{ opacity: s <= stars ? 1 : 0.25, filter: s <= stars ? 'drop-shadow(0 0 8px #fbbf24)' : 'none' }}>⭐</span>
              ))}
            </div>
            <p className="text-white/80 text-lg font-bold">{score} pts</p>
            <div className="flex gap-3 mt-2">
              <HBtn ha={hudActive} hp={hudProg} hid="win-retry" onClick={doReset}
                className="px-5 py-2.5 rounded-2xl text-white font-bold"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                ↺ Retry
              </HBtn>
              {levelId < TOTAL_LEVELS && (
                <HBtn ha={hudActive} hp={hudProg} hid="win-next" onClick={onNext}
                  className="px-6 py-2.5 rounded-2xl text-white font-black"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.5)' }}>
                  Next ▶
                </HBtn>
              )}
              <HBtn ha={hudActive} hp={hudProg} hid="win-quit" onClick={onQuit}
                className="px-5 py-2.5 rounded-2xl text-white/80 font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}>
                Levels
              </HBtn>
            </div>
          </div>
        )}

        {/* ── Fail overlay ── */}
        {phase === 'fail' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 12 }}>
            <div className="text-5xl">💔</div>
            <h2 className="text-3xl font-black text-white">They fell apart!</h2>
            <p className="text-white/60 text-sm">Draw a better path</p>
            <div className="flex gap-3">
              <HBtn ha={hudActive} hp={hudProg} hid="fail-retry" onClick={doReset}
                className="px-6 py-3 rounded-2xl text-white font-black text-lg"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.5)' }}>
                ↺ Try Again
              </HBtn>
              <HBtn ha={hudActive} hp={hudProg} hid="fail-quit" onClick={onQuit}
                className="px-5 py-3 rounded-2xl text-white/80 font-bold"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.2)' }}>
                Levels
              </HBtn>
            </div>
          </div>
        )}
      </div>

      {/* Hint line below canvas */}
      {phase === 'idle' && (
        <p className="text-white/40 text-xs mt-2">
          🤏 Pinch to draw  ·  👍 Thumbs-up to launch  ·  ✊ Fist to reset
        </p>
      )}
      {phase === 'rolling' && (
        <p className="text-white/40 text-xs mt-2">
          Balls rolling! 🤏 Pinch to draw more lines  ·  ✊ Fist to reset
        </p>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,   setScreen]   = useState<Screen>('landing');
  const [levelId,  setLevelId]  = useState(1);
  const [save,     setSave]     = useState<SaveData>(loadSave);

  function handleComplete(stars: number, score: number) {
    setSave(prev => {
      const next: SaveData = {
        unlockedLevels: [...prev.unlockedLevels],
        stars: { ...prev.stars },
        bestInk: { ...prev.bestInk },
      };
      if (stars > (prev.stars[levelId] ?? 0)) next.stars[levelId] = stars;
      const nextId = levelId + 1;
      if (nextId <= TOTAL_LEVELS && !next.unlockedLevels.includes(nextId))
        next.unlockedLevels.push(nextId);
      writeSave(next);
      return next;
    });
  }

  function handleNext() {
    const nextId = levelId + 1;
    if (nextId <= TOTAL_LEVELS) { setLevelId(nextId); setScreen('game'); }
    else setScreen('levelselect');
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-12px) rotate(5deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; background: #0c0820; }
      `}</style>

      {screen === 'landing' && (
        <LandingScreen save={save}
          onPlay={() => setScreen('levelselect')}
          onHow={() => setScreen('howtoplay')} />
      )}
      {screen === 'howtoplay' && (
        <HowToPlayScreen onBack={() => setScreen('landing')} />
      )}
      {screen === 'levelselect' && (
        <LevelSelectScreen save={save}
          onSelect={(id) => { setLevelId(id); setScreen('game'); }}
          onBack={() => setScreen('landing')} />
      )}
      {screen === 'game' && (
        <GameScreen key={levelId} levelId={levelId}
          onComplete={handleComplete}
          onQuit={() => setScreen('levelselect')}
          onNext={handleNext} />
      )}
    </>
  );
}
