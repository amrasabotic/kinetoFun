import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Matter from 'matter-js';
import { useMediaPipe, useMenuHand } from './hooks/useMediaPipe';
import { getLevel, LEVELS, type LevelDef } from './levels/index';
import {
  isPinching, isFist, smooth,
  type Landmark,
} from './utils/gestures';
import {
  initAudio, playDraw, playVictory,
  playStarSparkle, playHeart, playFailure, playReset, playInkEmpty,
} from './utils/audio';
import {
  GAME_W, GAME_H, BALL_R, LINE_W, MIN_DRAW_DIST,
  PINCH_THRESHOLD, PINCH_CONFIRM_MS, PINCH_RELEASE_MS,
  FIST_RESET_MS, DWELL_MS, CURSOR_R,
  GRAVITY_Y, BALL_RESTITUTION, BALL_FRICTION,
  LINE_FRICTION, LINE_RESTITUTION, PLATFORM_FRICTION,
  VICTORY_DIST, DEATH_Y, STAR3_THRESHOLD, STAR2_THRESHOLD,
  SCORE_PER_STAR, TOTAL_LEVELS,
} from './utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'landing' | 'howtoplay' | 'levelselect' | 'game';
type GamePhase = 'playing' | 'paused' | 'victory' | 'failure';

interface Vec2 { x: number; y: number; }

interface DrawnStroke {
  points: Vec2[];
  color: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;      // 0→1 (1 = alive)
  maxLife: number;
  color: string;
  type: 'heart' | 'dot' | 'star' | 'confetti';
  size: number;
  rotation: number;
  rotSpeed: number;
}

interface MovingObstacleState {
  body: Matter.Body;
  originX: number;
  originY: number;
  axis: 'x' | 'y';
  range: number;
  period: number;
  phase: number;     // phase offset [0,1]
}

interface RotatingBeamState {
  body: Matter.Body;
  speed: number;     // deg/s
  angle: number;     // current angle (deg)
}

interface SaveData {
  unlockedLevels: number[];
  stars: Record<number, number>;
  bestInk: Record<number, number>;
}

// ── Persistence ───────────────────────────────────────────────────────────────

const SAVE_KEY = 'glb_save_v1';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch { /* ignore */ }
  return { unlockedLevels: [1], stars: {}, bestInk: {} };
}

function writeSave(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcStars(inkUsed: number, inkLimit: number): number {
  const remaining = 1 - inkUsed / inkLimit;
  if (remaining >= STAR3_THRESHOLD) return 3;
  if (remaining >= STAR2_THRESHOLD) return 2;
  return 1;
}

function spawnParticles(
  list: Particle[],
  cx: number, cy: number,
  type: Particle['type'],
  count: number,
  colors: string[],
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    list.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1, maxLife: 0.8 + Math.random() * 0.9,
      color: colors[Math.floor(Math.random() * colors.length)],
      type, size: 6 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
    });
  }
}

function updateParticles(list: Particle[], dt: number) {
  const decay = dt / 1000;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx * dt * 0.05;
    p.y += p.vy * dt * 0.05;
    p.vy += 0.04 * dt * 0.05;   // mild gravity on particles
    p.rotation += p.rotSpeed;
    p.life -= decay / p.maxLife;
    if (p.life <= 0) list.splice(i, 1);
  }
}

// ── Canvas rendering helpers ──────────────────────────────────────────────────

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: 'blue' | 'pink',
  blinkT: number,  // 0–1, 0 = open, 1 = closed
  squash: number,  // 1 = normal, <1 = squashed
) {
  const rx = r;
  const ry = r * squash;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  const glowC = color === 'blue' ? 'rgba(96,165,250,' : 'rgba(244,114,182,';
  glow.addColorStop(0, glowC + '0.35)');
  glow.addColorStop(1, glowC + '0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(x, y, r * 2.2, r * 2.2, 0, 0, Math.PI * 2); ctx.fill();

  // Body gradient
  const grad = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, rx * 0.1, x, y, rx * 1.1);
  if (color === 'blue') {
    grad.addColorStop(0, '#93c5fd');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, '#1e3a8a');
  } else {
    grad.addColorStop(0, '#f9a8d4');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#831843');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft shadow outline
  ctx.strokeStyle = color === 'blue' ? 'rgba(30,58,138,0.5)' : 'rgba(131,24,67,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.28, y - ry * 0.30, rx * 0.28, ry * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = y - ry * 0.08;
  const eyeOff = rx * 0.28;
  const eyeH = blinkT > 0.85 ? 1 : (1 - blinkT) * rx * 0.18 + 1;
  const eyeW = rx * 0.16;
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.ellipse(x - eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
  // Eye shine
  if (blinkT < 0.85) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x - eyeOff + eyeW * 0.3, eyeY - eyeH * 0.3, eyeW * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOff + eyeW * 0.3, eyeY - eyeH * 0.3, eyeW * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  // Smile
  const smileY = y + ry * 0.28;
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, smileY, rx * 0.22, 0.15, Math.PI - 0.15);
  ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;

    if (p.type === 'heart') {
      const s = p.size * p.life * 0.8 + p.size * 0.2;
      ctx.font = `${s}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤', 0, 0);
    } else if (p.type === 'star') {
      const s = p.size * 0.7;
      ctx.font = `${s}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 0, 0);
    } else if (p.type === 'confetti') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  isPinch: boolean,
  progress: number,   // 0–1 pinch drawing fill
) {
  const r = CURSOR_R;
  ctx.save();

  // Outer ring
  ctx.strokeStyle = isPinch ? 'rgba(168,85,247,0.9)' : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = isPinch ? 3 : 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();

  // Fill arc for draw progress
  if (progress > 0) {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }

  // Inner dot
  const inner = ctx.createRadialGradient(x, y, 0, x, y, 8);
  inner.addColorStop(0, isPinch ? '#c084fc' : 'rgba(255,255,255,0.9)');
  inner.addColorStop(1, isPinch ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.3)');
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── DwellLayer – shared menu gesture handler ──────────────────────────────────

const DW_MS = DWELL_MS;
const CURSOR_R_MENU = 28;

function DwellLayer({
  children,
}: {
  children: (props: {
    hand: ReturnType<typeof useMenuHand>;
    active: string | null;
    progress: number;
  }) => React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef = useRef(hand); handRef.current = hand;

  const [active, setActive]     = useState<string | null>(null);
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
    let hovered: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach(el => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom)
        hovered = (el as HTMLElement).dataset.dwellId!;
    });

    if (hovered !== activeRef.current) {
      activeRef.current = hovered; setActive(hovered);
      dwellStart.current = hovered ? ts : null; setProgress(0);
    } else if (hovered && dwellStart.current !== null) {
      const p = Math.min((ts - dwellStart.current) / DW_MS, 1);
      setProgress(p);
      if (p >= 1) {
        (document.querySelector(`[data-dwell-id="${hovered}"]`) as HTMLElement | null)?.click();
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
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2
        bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
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
        className={`${className} ${isAct ? 'brightness-110 scale-[1.02]' : ''}
          transition-all duration-150 relative`}>
        {children}
      </button>
      <div className="absolute bottom-0 left-0 h-1 rounded-full pointer-events-none transition-none"
        style={{
          width: `${isAct ? progress * 100 : 0}%`,
          background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
          opacity: isAct ? 1 : 0,
        }} />
    </div>
  );
}

// ── Landing Screen ────────────────────────────────────────────────────────────

function LandingScreen({
  onPlay, onHow, save,
}: { onPlay: () => void; onHow: () => void; save: SaveData }) {
  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  return (
    <DwellLayer>
      {({ hand: _h, active, progress }) => (
        <div className="h-screen flex flex-col items-center justify-center overflow-hidden px-6"
          style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1e0b3b 50%,#0f0a1e 100%)' }}>

          {/* Floating hearts background */}
          {['💜','💙','🩷','❤️'].map((h, i) => (
            <div key={i} className="pointer-events-none absolute text-4xl opacity-20 select-none"
              style={{
                left: `${15 + i * 22}%`, top: `${8 + i * 12}%`,
                animation: `floatUp ${3 + i * 0.7}s ease-in-out infinite alternate`,
              }}>{h}</div>
          ))}

          <div className="flex flex-col items-center gap-5 w-full max-w-md relative z-10">
            {/* Title */}
            <div className="text-7xl select-none" style={{
              filter: 'drop-shadow(0 0 28px rgba(168,85,247,0.7))',
              animation: 'floatUp 2s ease-in-out infinite alternate',
            }}>🩷💙</div>
            <h1 className="text-5xl font-black text-center leading-tight"
              style={{
                background: 'linear-gradient(180deg,#ffffff 0%,#c084fc 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
              Love Balls
            </h1>
            <p className="text-purple-300 text-sm tracking-widest uppercase font-bold">
              Gesture Physics Puzzle
            </p>

            {/* Stats chip */}
            {totalStars > 0 && (
              <div className="px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(168,85,247,0.22)', border: '1.5px solid rgba(168,85,247,0.55)' }}>
                <span className="text-yellow-300">⭐ {totalStars}</span>
                <span className="text-white/70"> stars earned</span>
              </div>
            )}

            {/* Gesture hint */}
            <div className="grid grid-cols-3 gap-3 w-full text-center">
              {[
                { icon: '☝️', label: 'Cursor', sub: 'Index finger' },
                { icon: '🤏', label: 'Draw', sub: 'Pinch + move' },
                { icon: '✊', label: 'Reset', sub: 'Fist gesture' },
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
              Hover your hand over a button for 1 second to select
            </p>

            <div className="flex flex-col gap-3 w-full">
              <DBtn id="play" active={active} progress={progress}
                onClick={() => { initAudio(); onPlay(); }}
                className="w-full min-h-[80px] flex items-center justify-center gap-3 text-white font-black text-2xl rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg,#6d28d9 0%,#a855f7 50%,#7c3aed 100%)',
                  boxShadow: '0 8px 32px rgba(168,85,247,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
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
  { icon: '📷', title: 'Camera Setup', color: '#94a3b8',
    desc: 'Allow camera access. Make sure your hand is clearly visible and well-lit.' },
  { icon: '☝️', title: '1 · Move Cursor', color: '#a855f7',
    desc: 'Your index fingertip controls the cursor. Move it smoothly — it is auto-smoothed.' },
  { icon: '🤏', title: '2 · Draw', color: '#ec4899',
    desc: 'Pinch your thumb and index finger together, then move your hand to draw a line. Release to solidify it.' },
  { icon: '🎯', title: '3 · Connect Balls', color: '#3b82f6',
    desc: 'Draw a path that lets the blue and pink balls roll or fall into each other.' },
  { icon: '✊', title: 'Reset', color: '#f97316',
    desc: 'Make a fist for 1 second to erase your drawings and restart. Or hover over the Reset button.' },
  { icon: '🖊️', title: 'Ink Meter', color: '#22c55e',
    desc: 'Each level has limited ink. Use less for more stars: 70 %+ left = ⭐⭐⭐.' },
  { icon: '🏆', title: 'Scoring', color: '#fbbf24',
    desc: '3 stars = 300 pts · 2 stars = 200 pts · 1 star = 100 pts. Stars unlock the next level.' },
];

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <DwellLayer>
      {({ hand: _h, active, progress }) => (
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
            <DBtn id="back" active={active} progress={progress} onClick={onBack}
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

function LevelSelectScreen({
  save, onSelect, onBack,
}: { save: SaveData; onSelect: (id: number) => void; onBack: () => void }) {
  return (
    <DwellLayer>
      {({ hand: _h, active, progress }) => (
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
                const stars    = save.stars[lv.id] ?? 0;
                const isAct    = active === `lv-${lv.id}`;
                return (
                  <DBtn key={lv.id} id={`lv-${lv.id}`} active={active} progress={progress}
                    onClick={() => unlocked && onSelect(lv.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                    style={{
                      background: unlocked
                        ? (isAct ? 'rgba(168,85,247,0.30)' : 'rgba(168,85,247,0.15)')
                        : 'rgba(255,255,255,0.05)',
                      border: unlocked
                        ? `2px solid rgba(168,85,247,${isAct ? '0.8' : '0.45'})`
                        : '2px solid rgba(255,255,255,0.12)',
                      opacity: unlocked ? 1 : 0.5,
                    }}>
                    <span className="text-lg font-black text-white">{lv.id}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3].map(s => (
                        <span key={s} className="text-xs"
                          style={{ opacity: s <= stars ? 1 : 0.2 }}>⭐</span>
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

// ── Game Screen ───────────────────────────────────────────────────────────────

interface GameScreenProps {
  levelId: number;
  save: SaveData;
  onComplete: (stars: number, score: number) => void;
  onQuit: () => void;
  onNext: () => void;
}

function GameScreen({ levelId, save: _save, onComplete, onQuit, onNext }: GameScreenProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const handRef    = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);

  // ── React display state (HUD + overlays only) ──────────────────────────────
  const [inkPct,  setInkPct]  = useState(1);
  const [phase,   setPhase]   = useState<GamePhase>('playing');
  const [stars,   setStars]   = useState(0);
  const [score,   setScore]   = useState(0);
  const [hintVis, setHintVis] = useState(false);

  // ── Mutable game state (never triggers re-renders) ─────────────────────────
  const physRef = useRef<{
    engine:   Matter.Engine;
    ballBlue: Matter.Body | null;
    ballPink: Matter.Body | null;
    level:    LevelDef;
    levelBodies:   Matter.Body[];
    spikeBodies:   Matter.Body[];
    drawnBodies:   Matter.Body[];
    movingObs:     MovingObstacleState[];
    rotatingBeams: RotatingBeamState[];
  } | null>(null);

  const drawRef = useRef({
    isDrawing:   false,
    currentPath: [] as Vec2[],
    strokes:     [] as DrawnStroke[],
    inkUsed:     0,
    lastInkWarnSent: false,
  });

  const animRef = useRef({
    particles:    [] as Particle[],
    victoryTimer: 0,
    failTimer:    0,
    phaseRef:     'playing' as GamePhase,
    blueBlinkT:   0, blueBounce: 0, blueSquash: 1,
    pinkBlinkT:   0, pinkBounce: 0, pinkSquash: 1,
    blueBlinkDir: 1, pinkBlinkDir: 1,
    shakeX: 0, shakeY: 0,
    starsEarned: 0,
    scoreEarned: 0,
    wonSent: false,
    // gesture smoothing
    curSX: 0.5, curSY: 0.5,
    pinchHeldMs:   0,
    releaseHeldMs: 0,
    fistHeldMs:    0,
    lastPinch:     false,
    lastFist:      false,
    prevPinchActive: false,
  });

  const rafRef  = useRef(0);
  const lastTRef = useRef(0);

  // ── Build the physics world ────────────────────────────────────────────────
  function buildWorld(lv: LevelDef) {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY_Y * 1, scale: 0.001 },
    });
    const world = engine.world;

    // Boundary walls (left + right, no floor — falling = failure)
    const wallOpts = { isStatic: true, friction: PLATFORM_FRICTION, label: 'wall' };
    Matter.Composite.add(world, [
      Matter.Bodies.rectangle(-25, GAME_H / 2, 50, GAME_H, wallOpts),
      Matter.Bodies.rectangle(GAME_W + 25, GAME_H / 2, 50, GAME_H, wallOpts),
    ]);

    const levelBodies: Matter.Body[] = [];
    const spikeBodies: Matter.Body[] = [];

    // Platforms
    const platOpts = { isStatic: true, friction: PLATFORM_FRICTION, restitution: 0.1, label: 'platform' };
    for (const p of lv.platforms ?? []) {
      const b = Matter.Bodies.rectangle(
        p.x + p.w / 2, p.y + p.h / 2, p.w, p.h,
        { ...platOpts, angle: ((p.angle ?? 0) * Math.PI) / 180 },
      );
      levelBodies.push(b);
      Matter.Composite.add(world, b);
    }

    // Spikes
    const spikeOpts = { isStatic: true, friction: 0, restitution: 0, isSensor: true, label: 'spike' };
    for (const s of lv.spikes ?? []) {
      const b = Matter.Bodies.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, spikeOpts);
      spikeBodies.push(b);
      Matter.Composite.add(world, b);
    }

    // Moving blocks
    const movingObs: MovingObstacleState[] = [];
    for (const mb of lv.movingBlocks ?? []) {
      const b = Matter.Bodies.rectangle(
        mb.x + mb.w / 2, mb.y + mb.h / 2, mb.w, mb.h,
        { isStatic: true, friction: PLATFORM_FRICTION, label: 'moving' },
      );
      Matter.Composite.add(world, b);
      movingObs.push({
        body: b, originX: mb.x + mb.w / 2, originY: mb.y + mb.h / 2,
        axis: mb.axis, range: mb.range, period: mb.period,
        phase: mb.phase ?? 0,
      });
    }

    // Rotating beams
    const rotatingBeams: RotatingBeamState[] = [];
    for (const rb of lv.rotatingBeams ?? []) {
      const b = Matter.Bodies.rectangle(
        rb.x, rb.y, rb.w, rb.h,
        { isStatic: true, friction: PLATFORM_FRICTION, label: 'rotating' },
      );
      Matter.Composite.add(world, b);
      rotatingBeams.push({
        body: b, speed: rb.speed, angle: rb.startAngle ?? 0,
      });
    }

    // Balls
    const ballOpts = {
      friction: BALL_FRICTION,
      restitution: BALL_RESTITUTION,
      density: 0.002,
    };
    const ballBlue = Matter.Bodies.circle(lv.balls[0].x, lv.balls[0].y, BALL_R,
      { ...ballOpts, label: 'ball_blue' });
    const ballPink = Matter.Bodies.circle(lv.balls[1].x, lv.balls[1].y, BALL_R,
      { ...ballOpts, label: 'ball_pink' });
    Matter.Composite.add(world, [ballBlue, ballPink]);

    return { engine, ballBlue, ballPink, levelBodies, spikeBodies, drawnBodies: [] as Matter.Body[], movingObs, rotatingBeams, level: lv };
  }

  // ── Ink drawing → physics bodies ──────────────────────────────────────────
  function solidifyPath(path: Vec2[]) {
    if (!physRef.current || path.length < 2) return;
    const world = physRef.current.engine.world;
    const bodies: Matter.Body[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i], p2 = path[i + 1];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 2) continue;
      const angle = Math.atan2(dy, dx);
      const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
      const b = Matter.Bodies.rectangle(cx, cy, len + 2, LINE_W * 2, {
        angle, isStatic: true,
        friction: LINE_FRICTION, restitution: LINE_RESTITUTION,
        label: 'drawn',
      });
      bodies.push(b);
    }
    Matter.Composite.add(world, bodies);
    physRef.current.drawnBodies.push(...bodies);
  }

  function clearDrawings() {
    if (!physRef.current) return;
    const world = physRef.current.engine.world;
    physRef.current.drawnBodies.forEach(b => Matter.Composite.remove(world, b));
    physRef.current.drawnBodies = [];
    drawRef.current.strokes     = [];
    drawRef.current.inkUsed     = 0;
    drawRef.current.lastInkWarnSent = false;
  }

  function resetLevel() {
    if (!physRef.current) return;
    clearDrawings();
    const lv = physRef.current.level;
    const { ballBlue, ballPink } = physRef.current;
    if (ballBlue) {
      Matter.Body.setPosition(ballBlue, { x: lv.balls[0].x, y: lv.balls[0].y });
      Matter.Body.setVelocity(ballBlue, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(ballBlue, 0);
    }
    if (ballPink) {
      Matter.Body.setPosition(ballPink, { x: lv.balls[1].x, y: lv.balls[1].y });
      Matter.Body.setVelocity(ballPink, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(ballPink, 0);
    }
    animRef.current.phaseRef     = 'playing';
    animRef.current.victoryTimer = 0;
    animRef.current.failTimer    = 0;
    animRef.current.particles    = [];
    animRef.current.wonSent      = false;
    animRef.current.fistHeldMs   = 0;
    drawRef.current.isDrawing    = false;
    drawRef.current.currentPath  = [];
    setPhase('playing');
    setInkPct(1);
    playReset();
  }

  // ── Main game loop ─────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const rawDt = lastTRef.current ? ts - lastTRef.current : 16;
    const dt = Math.min(rawDt, 50);
    lastTRef.current = ts;

    const ph    = physRef.current;
    const dr    = drawRef.current;
    const an    = animRef.current;
    const lv    = ph?.level;
    const hand  = handRef.current;

    if (!ph || !lv) { rafRef.current = requestAnimationFrame(loop); return; }

    // ── Smooth cursor ────────────────────────────────────────────────────────
    if (hand.detected) {
      an.curSX = smooth(an.curSX, hand.cursorX, 0.22);
      an.curSY = smooth(an.curSY, hand.cursorY, 0.22);
    }
    const curX = an.curSX * GAME_W;
    const curY = an.curSY * GAME_H;

    // ── Gesture recognition ──────────────────────────────────────────────────
    const lm     = hand.landmarks as Landmark[];
    const pinchRaw = hand.detected && isPinching(lm, PINCH_THRESHOLD);
    const fistRaw  = hand.detected && isFist(lm);

    if (pinchRaw) { an.pinchHeldMs += dt; an.releaseHeldMs = 0; }
    else          { an.releaseHeldMs += dt; an.pinchHeldMs  = 0; }

    const pinchActive  = an.pinchHeldMs  >= PINCH_CONFIRM_MS;
    const releaseActive = an.releaseHeldMs >= PINCH_RELEASE_MS;

    if (fistRaw) an.fistHeldMs += dt;
    else         an.fistHeldMs  = 0;

    // ── Phase: paused ────────────────────────────────────────────────────────
    if (an.phaseRef === 'paused') {
      updateParticles(an.particles, dt);
      render(ts, curX, curY, pinchActive, false, 0);
      rafRef.current = requestAnimationFrame(loop); return;
    }

    // ── Phase: victory / failure (anim-only) ─────────────────────────────────
    if (an.phaseRef === 'victory' || an.phaseRef === 'failure') {
      if (an.phaseRef === 'victory') an.victoryTimer += dt;
      else                           an.failTimer    += dt;
      updateParticles(an.particles, dt);
      // Emit more hearts while animating
      if (an.phaseRef === 'victory' && an.victoryTimer < 2000 && Math.random() < 0.15) {
        const bx = ph.ballBlue  ? ph.ballBlue.position.x  : GAME_W / 2;
        const px = ph.ballPink  ? ph.ballPink.position.x  : GAME_W / 2;
        const by = ph.ballBlue  ? ph.ballBlue.position.y  : GAME_H / 2;
        spawnParticles(an.particles, (bx + px) / 2, by, 'heart', 2,
          ['#f472b6', '#a855f7', '#ec4899', '#fb7185']);
        spawnParticles(an.particles, (bx + px) / 2, by, 'confetti', 2,
          ['#fbbf24', '#a855f7', '#34d399', '#fb7185', '#60a5fa']);
      }
      render(ts, curX, curY, false, false, 0);
      rafRef.current = requestAnimationFrame(loop); return;
    }

    // ── Phase: playing ───────────────────────────────────────────────────────

    // Fist → reset (with dwell)
    if (an.fistHeldMs >= FIST_RESET_MS && an.phaseRef === 'playing') {
      an.fistHeldMs = 0;
      resetLevel();
      rafRef.current = requestAnimationFrame(loop); return;
    }

    // Drawing
    const inkLimit = lv.inkLimit;
    const inkLeft  = Math.max(0, inkLimit - dr.inkUsed);

    if (pinchActive && !an.prevPinchActive) {
      // Start drawing
      dr.isDrawing    = true;
      dr.currentPath  = [{ x: curX, y: curY }];
    }

    if (pinchActive && dr.isDrawing && inkLeft > 0) {
      const last = dr.currentPath[dr.currentPath.length - 1];
      const dist = Math.hypot(curX - last.x, curY - last.y);
      if (dist >= MIN_DRAW_DIST) {
        const canDraw = Math.min(dist, inkLeft);
        dr.inkUsed += canDraw;
        dr.currentPath.push({ x: curX, y: curY });
        if (Math.random() < 0.4) playDraw();

        // Ink nearly empty warning
        if (dr.inkUsed >= inkLimit * 0.95 && !dr.lastInkWarnSent) {
          playInkEmpty();
          dr.lastInkWarnSent = true;
        }
      }
    }

    if (releaseActive && an.prevPinchActive && dr.isDrawing) {
      // Finish stroke → solidify
      if (dr.currentPath.length >= 2) {
        solidifyPath(dr.currentPath);
        dr.strokes.push({
          points: [...dr.currentPath],
          color: '#a855f7',
        });
      }
      dr.currentPath  = [];
      dr.isDrawing    = false;
    }

    an.prevPinchActive = pinchActive;

    // Update ink HUD (throttled)
    const newPct = Math.max(0, 1 - dr.inkUsed / inkLimit);
    setInkPct(newPct);

    // Update moving obstacles
    const t = ts / 1000;
    for (const mo of ph.movingObs) {
      const phaseT = (t / (mo.period / 1000) + mo.phase) % 1;
      const offset  = Math.sin(phaseT * Math.PI * 2) * mo.range;
      const nx = mo.axis === 'x' ? mo.originX + offset : mo.originX;
      const ny = mo.axis === 'y' ? mo.originY + offset : mo.originY;
      Matter.Body.setPosition(mo.body, { x: nx, y: ny });
      Matter.Body.setVelocity(mo.body, { x: 0, y: 0 });
    }

    // Update rotating beams
    for (const rb of ph.rotatingBeams) {
      rb.angle += rb.speed * (dt / 1000);
      Matter.Body.setAngle(rb.body, (rb.angle * Math.PI) / 180);
      Matter.Body.setAngularVelocity(rb.body, 0);
    }

    // Step physics
    Matter.Engine.update(ph.engine, dt);

    // Ball animations
    an.blueBlinkT  = (an.blueBlinkT + dt * 0.0008 * an.blueBlinkDir);
    if (an.blueBlinkT >= 1 || an.blueBlinkT <= 0) an.blueBlinkDir *= -1;
    an.pinkBlinkT  = (an.pinkBlinkT + dt * 0.0006 * an.pinkBlinkDir);
    if (an.pinkBlinkT >= 1 || an.pinkBlinkT <= 0) an.pinkBlinkDir *= -1;
    // Random blink
    if (Math.random() < 0.003) { an.blueBlinkT = 0; an.blueBlinkDir = 1; }
    if (Math.random() < 0.003) { an.pinkBlinkT = 0; an.pinkBlinkDir = 1; }

    updateParticles(an.particles, dt);

    // ── Victory check ────────────────────────────────────────────────────────
    if (ph.ballBlue && ph.ballPink) {
      const bpos = ph.ballBlue.position, ppos = ph.ballPink.position;
      const dist = Math.hypot(bpos.x - ppos.x, bpos.y - ppos.y);
      if (dist < VICTORY_DIST) {
        const starsEarned = calcStars(dr.inkUsed, lv.inkLimit);
        const sc          = starsEarned * SCORE_PER_STAR;
        an.starsEarned    = starsEarned;
        an.scoreEarned    = sc;
        an.phaseRef       = 'victory';
        setPhase('victory');
        setStars(starsEarned);
        setScore(sc);
        // Particles
        const mx = (bpos.x + ppos.x) / 2, my = (bpos.y + ppos.y) / 2;
        spawnParticles(an.particles, mx, my, 'heart', 18,
          ['#f472b6', '#a855f7', '#ec4899', '#fb7185', '#e879f9']);
        spawnParticles(an.particles, mx, my, 'confetti', 22,
          ['#fbbf24', '#a855f7', '#34d399', '#fb7185', '#60a5fa', '#f9a8d4']);
        // Camera shake
        an.shakeX = 6; an.shakeY = 5;
        if (!an.wonSent) {
          an.wonSent = true;
          playVictory();
          playHeart();
          setTimeout(() => playStarSparkle(starsEarned), 500);
          window.parent.postMessage({ type: 'GAME_COMPLETE', score: sc }, '*');
          onComplete(starsEarned, sc);
        }
      }
    }

    // ── Spike / death check ───────────────────────────────────────────────────
    if (an.phaseRef === 'playing') {
      const blue = ph.ballBlue, pink = ph.ballPink;
      const bDead = blue && (blue.position.y > DEATH_Y);
      const pDead = pink && (pink.position.y > DEATH_Y);

      // Spike collision via Matter.js events (handled in setup; also do manual check)
      for (const sb of ph.spikeBodies) {
        const checkBall = (ball: Matter.Body | null) => {
          if (!ball) return false;
          const dx = ball.position.x - sb.position.x;
          const dy = ball.position.y - sb.position.y;
          const hw = (sb.bounds.max.x - sb.bounds.min.x) / 2;
          const hh = (sb.bounds.max.y - sb.bounds.min.y) / 2;
          return Math.abs(dx) < hw + BALL_R && Math.abs(dy) < hh + BALL_R;
        };
        if (checkBall(blue) || checkBall(pink)) {
          an.phaseRef = 'failure'; setPhase('failure');
          playFailure();
          an.shakeX = 10; an.shakeY = 10;
          break;
        }
      }

      if ((bDead || pDead) && an.phaseRef === 'playing') {
        an.phaseRef = 'failure'; setPhase('failure');
        playFailure();
        an.shakeX = 10; an.shakeY = 10;
      }
    }

    // Decay shake
    an.shakeX *= 0.85; an.shakeY *= 0.85;
    if (Math.abs(an.shakeX) < 0.1) an.shakeX = 0;
    if (Math.abs(an.shakeY) < 0.1) an.shakeY = 0;

    // Render frame
    const inkProgress = newPct;
    render(ts, curX, curY, pinchActive, dr.isDrawing, inkProgress);
    rafRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas renderer ────────────────────────────────────────────────────────
  function render(
    _ts: number,
    curX: number, curY: number,
    pinch: boolean,
    drawing: boolean,
    _inkPct: number,
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ph = physRef.current;
    const dr = drawRef.current;
    const an = animRef.current;

    const sx = (an.shakeX * (Math.random() - 0.5)) | 0;
    const sy = (an.shakeY * (Math.random() - 0.5)) | 0;
    ctx.save();
    ctx.translate(sx, sy);

    ctx.clearRect(-20, -20, GAME_W + 40, GAME_H + 40);

    // ── Background ──────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, GAME_H);
    bg.addColorStop(0, '#0c0820');
    bg.addColorStop(1, '#1a0835');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(168,85,247,0.05)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < GAME_W; gx += 50) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GAME_H); ctx.stroke();
    }
    for (let gy = 0; gy < GAME_H; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GAME_W, gy); ctx.stroke();
    }

    // ── Level bodies ────────────────────────────────────────────────────────
    if (ph) {
      // Platforms
      for (const b of ph.levelBodies) {
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        const vs = b.vertices;
        const w2 = (b.bounds.max.x - b.bounds.min.x) / 2;
        const h2 = (b.bounds.max.y - b.bounds.min.y) / 2;

        // Glow
        ctx.shadowColor  = '#a855f7';
        ctx.shadowBlur   = 8;
        ctx.fillStyle    = '#3b1d6b';
        ctx.strokeStyle  = '#7c3aed';
        ctx.lineWidth    = 2;

        ctx.beginPath();
        ctx.moveTo(vs[0].x - b.position.x, vs[0].y - b.position.y);
        for (let i = 1; i < vs.length; i++)
          ctx.lineTo(vs[i].x - b.position.x, vs[i].y - b.position.y);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Top highlight
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(168,85,247,0.45)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w2 + 3, -h2 + 2);
        ctx.lineTo( w2 - 3, -h2 + 2);
        ctx.stroke();

        ctx.restore();
      }

      // Spikes
      for (const b of ph.spikeBodies) {
        ctx.save();
        const w = b.bounds.max.x - b.bounds.min.x;
        const h = b.bounds.max.y - b.bounds.min.y;
        const bx = b.bounds.min.x, by = b.bounds.min.y;
        const count = Math.floor(w / 20);
        const sw = w / count;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8;
        for (let i = 0; i < count; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + i * sw, by + h);
          ctx.lineTo(bx + i * sw + sw / 2, by);
          ctx.lineTo(bx + (i + 1) * sw, by + h);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }

      // Moving blocks
      for (const mo of ph.movingObs) {
        const b = mo.body;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        const vs = b.vertices;
        ctx.fillStyle   = '#4c1d95';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(vs[0].x - b.position.x, vs[0].y - b.position.y);
        for (let i = 1; i < vs.length; i++)
          ctx.lineTo(vs[i].x - b.position.x, vs[i].y - b.position.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Rotating beams
      for (const rb of ph.rotatingBeams) {
        const b = rb.body;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        const vs = b.vertices;
        ctx.fillStyle   = '#7c2d12';
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#ea580c'; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(vs[0].x - b.position.x, vs[0].y - b.position.y);
        for (let i = 1; i < vs.length; i++)
          ctx.lineTo(vs[i].x - b.position.x, vs[i].y - b.position.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Drawn strokes (visual layer, on top of physics for clarity)
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of dr.strokes) {
        if (stroke.points.length < 2) continue;
        // Glow pass
        ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(168,85,247,0.35)';
        ctx.lineWidth   = LINE_W * 2.2;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++)
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        ctx.stroke();
        // Main line
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth   = LINE_W * 1.6;
        ctx.stroke();
        // Highlight
        ctx.strokeStyle = 'rgba(216,180,254,0.55)';
        ctx.lineWidth   = LINE_W * 0.5;
        ctx.stroke();
      }

      // Current drawing path (live preview)
      if (drawing && dr.currentPath.length >= 2) {
        ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(192,132,252,0.45)';
        ctx.lineWidth   = LINE_W * 2.4;
        ctx.lineCap     = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(dr.currentPath[0].x, dr.currentPath[0].y);
        for (let i = 1; i < dr.currentPath.length; i++)
          ctx.lineTo(dr.currentPath[i].x, dr.currentPath[i].y);
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth   = LINE_W * 1.8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ── Balls ─────────────────────────────────────────────────────────────
      if (ph.ballBlue) {
        drawBall(ctx, ph.ballBlue.position.x, ph.ballBlue.position.y, BALL_R,
          'blue', an.blueBlinkT, an.blueSquash);
      }
      if (ph.ballPink) {
        drawBall(ctx, ph.ballPink.position.x, ph.ballPink.position.y, BALL_R,
          'pink', an.pinkBlinkT, an.pinkSquash);
      }
    }

    // ── Particles ────────────────────────────────────────────────────────────
    drawParticles(ctx, an.particles);

    // ── Cursor ───────────────────────────────────────────────────────────────
    if (handRef.current.detected) {
      const inkProgress2 = (dr.inkUsed / (ph?.level.inkLimit ?? 1));
      drawCursor(ctx, curX, curY, pinch, inkProgress2);
    }

    // ── Fist reset ring ───────────────────────────────────────────────────────
    if (an.fistHeldMs > 100 && an.phaseRef === 'playing') {
      const fp = an.fistHeldMs / FIST_RESET_MS;
      ctx.save();
      const rx = GAME_W / 2, ry = GAME_H - 50;
      ctx.strokeStyle = `rgba(249,115,22,${fp * 0.8})`;
      ctx.lineWidth   = 5;
      ctx.beginPath();
      ctx.arc(curX, curY, CURSOR_R + 14, -Math.PI / 2, -Math.PI / 2 + fp * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      void rx; void ry;
    }

    ctx.restore();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const lv = getLevel(levelId);
    physRef.current = buildWorld(lv);
    drawRef.current = { isDrawing: false, currentPath: [], strokes: [], inkUsed: 0, lastInkWarnSent: false };
    animRef.current = {
      particles: [], victoryTimer: 0, failTimer: 0,
      phaseRef: 'playing',
      blueBlinkT: 0, blueBounce: 0, blueSquash: 1,
      pinkBlinkT: 0, pinkBounce: 0, pinkSquash: 1,
      blueBlinkDir: 1, pinkBlinkDir: 1,
      shakeX: 0, shakeY: 0,
      starsEarned: 0, scoreEarned: 0, wonSent: false,
      curSX: 0.5, curSY: 0.5,
      pinchHeldMs: 0, releaseHeldMs: 0, fistHeldMs: 0,
      lastPinch: false, lastFist: false, prevPinchActive: false,
    };
    setPhase('playing'); setInkPct(1); setStars(0); setScore(0);
    lastTRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (physRef.current) {
        Matter.Engine.clear(physRef.current.engine);
        physRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  // Canvas scale
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function resize() {
      setScale(Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H) * 0.96);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const lv = getLevel(levelId);
  const inkPctDisplay = inkPct;

  // Dwell state for in-game HUD buttons
  const [activeHud, setActiveHud] = useState<string | null>(null);
  const [hudProg,   setHudProg]   = useState(0);
  const hudDwellStart = useRef<number | null>(null);
  const activeHudRef  = useRef<string | null>(null);
  const hudRafRef     = useRef(0);

  const hudLoop = useCallback((ts: number) => {
    const hand = handRef.current;
    if (!hand.detected) {
      setActiveHud(null); setHudProg(0);
      hudDwellStart.current = null; activeHudRef.current = null;
      hudRafRef.current = requestAnimationFrame(hudLoop); return;
    }
    // Convert from game coords → screen coords
    const rect = canvasRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) { hudRafRef.current = requestAnimationFrame(hudLoop); return; }
    const sc   = rect.width / GAME_W;
    const cx   = rect.left + (1 - hand.cursorX) * GAME_W * sc;  // NOT smoothed for HUD
    const cy   = rect.top  + hand.cursorY * GAME_H * sc;

    let hov: string | null = null;
    document.querySelectorAll('[data-hud-id]').forEach(el => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom)
        hov = (el as HTMLElement).dataset.hudId!;
    });

    if (hov !== activeHudRef.current) {
      activeHudRef.current = hov; setActiveHud(hov);
      hudDwellStart.current = hov ? ts : null; setHudProg(0);
    } else if (hov && hudDwellStart.current !== null) {
      const p = Math.min((ts - hudDwellStart.current) / DWELL_MS, 1);
      setHudProg(p);
      if (p >= 1) {
        (document.querySelector(`[data-hud-id="${hov}"]`) as HTMLElement | null)?.click();
        hudDwellStart.current = null; setActiveHud(null); setHudProg(0); activeHudRef.current = null;
      }
    }
    hudRafRef.current = requestAnimationFrame(hudLoop);
  }, []);

  useEffect(() => {
    hudRafRef.current = requestAnimationFrame(hudLoop);
    return () => cancelAnimationFrame(hudRafRef.current);
  }, [hudLoop]);

  function HudBtn({
    hid, children, onClick, className = '', style,
  }: { hid: string; children: React.ReactNode; onClick: () => void; className?: string; style?: React.CSSProperties }) {
    const isAct = activeHud === hid;
    return (
      <div className="relative overflow-hidden rounded-xl">
        <button data-hud-id={hid}
          onClick={(e) => { if (e.isTrusted) return; onClick(); }}
          onMouseDown={(e) => e.preventDefault()}
          style={{ cursor: 'default', ...style }}
          className={`${className} ${isAct ? 'brightness-110' : ''} transition-all`}>
          {children}
        </button>
        <div className="absolute bottom-0 left-0 h-0.5 pointer-events-none"
          style={{ width: `${isAct ? hudProg * 100 : 0}%`, background: '#a855f7' }} />
      </div>
    );
  }

  // Star display for victory
  const starColors = ['#fbbf24', '#f59e0b', '#fcd34d'];

  return (
    <div className="h-screen flex items-center justify-center overflow-hidden" style={{ background: '#0c0820' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <div className="relative" style={{ width: GAME_W, height: GAME_H }}>
          {/* Main canvas */}
          <canvas ref={canvasRef} width={GAME_W} height={GAME_H} className="block" />

          {/* HUD overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 pointer-events-auto">
              {/* Level # */}
              <div className="px-3 py-1.5 rounded-xl text-white font-black text-sm"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(168,85,247,0.45)' }}>
                Level {levelId}
              </div>

              {/* Ink meter */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-white/70 text-xs font-bold uppercase tracking-wide">Ink</div>
                <div className="w-36 h-4 rounded-full overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(168,85,247,0.4)' }}>
                  <div className="h-full rounded-full transition-none"
                    style={{
                      width: `${inkPctDisplay * 100}%`,
                      background: inkPctDisplay > 0.4
                        ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
                        : inkPctDisplay > 0.2
                        ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                        : 'linear-gradient(90deg,#dc2626,#f87171)',
                    }} />
                </div>
                <div className="text-white/60 text-[10px] font-semibold">
                  {Math.round(inkPctDisplay * 100)}% left
                </div>
              </div>

              {/* Pause button */}
              <HudBtn hid="pause" onClick={() => {
                const cur = animRef.current.phaseRef;
                if (cur === 'playing') { animRef.current.phaseRef = 'paused'; setPhase('paused'); }
                else if (cur === 'paused') { animRef.current.phaseRef = 'playing'; setPhase('playing'); }
              }}
                className="px-3 py-1.5 rounded-xl text-white font-bold text-sm"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                {phase === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </HudBtn>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3 pointer-events-auto">
              {/* Reset button */}
              <HudBtn hid="reset" onClick={resetLevel}
                className="px-3 py-2 rounded-xl text-white font-bold text-sm"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(249,115,22,0.5)' }}>
                🔄 Reset
              </HudBtn>

              {/* Hint */}
              <div className="flex flex-col items-center gap-1">
                {hintVis && (
                  <div className="px-4 py-2 rounded-xl text-white text-xs font-medium max-w-xs text-center"
                    style={{ background: 'rgba(0,0,0,0.75)', border: '1.5px solid rgba(168,85,247,0.5)' }}>
                    💡 {lv.hint}
                  </div>
                )}
                <HudBtn hid="hint" onClick={() => setHintVis(v => !v)}
                  className="px-3 py-2 rounded-xl text-white font-bold text-sm"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                  💡 Hint
                </HudBtn>
              </div>

              {/* Quit */}
              <HudBtn hid="quit" onClick={onQuit}
                className="px-3 py-2 rounded-xl text-white font-bold text-sm"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                ⚙ Levels
              </HudBtn>
            </div>

            {/* No hand warning */}
            {!handRef.current.detected && phase === 'playing' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
                  style={{ background: 'rgba(0,0,0,0.72)', border: '1.5px solid rgba(168,85,247,0.5)' }}>
                  <span className="text-5xl">✋</span>
                  <p className="text-white font-black text-xl">Show your hand!</p>
                  <p className="text-purple-200 text-sm">Hold it in front of the camera</p>
                </div>
              </div>
            )}
          </div>

          {/* Paused overlay */}
          {phase === 'paused' && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}>
              <DwellLayer>
                {({ hand: _h, active, progress }) => (
                  <div className="flex flex-col items-center gap-5 px-10 py-8 rounded-3xl"
                    style={{ background: 'rgba(15,8,32,0.95)', border: '1.5px solid rgba(168,85,247,0.4)' }}>
                    <p className="text-3xl font-black text-white">⏸ Paused</p>
                    <DBtn id="p-resume" active={active} progress={progress}
                      onClick={() => { animRef.current.phaseRef = 'playing'; setPhase('playing'); }}
                      className="w-full min-h-[60px] px-8 flex items-center justify-center text-white font-black text-xl rounded-2xl"
                      style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                      ▶ Resume
                    </DBtn>
                    <DBtn id="p-reset" active={active} progress={progress}
                      onClick={() => { animRef.current.phaseRef = 'playing'; setPhase('playing'); resetLevel(); }}
                      className="w-full min-h-[52px] px-8 flex items-center justify-center text-white font-bold text-lg rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                      🔄 Restart
                    </DBtn>
                    <DBtn id="p-quit" active={active} progress={progress} onClick={onQuit}
                      className="w-full min-h-[52px] px-8 flex items-center justify-center text-white font-bold text-lg rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                      📋 Level Select
                    </DBtn>
                  </div>
                )}
              </DwellLayer>
            </div>
          )}

          {/* Victory overlay */}
          {phase === 'victory' && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
              <DwellLayer>
                {({ hand: _h, active, progress }) => (
                  <div className="flex flex-col items-center gap-4 px-10 py-7 rounded-3xl w-96"
                    style={{ background: 'rgba(15,8,32,0.97)', border: '2px solid rgba(168,85,247,0.55)' }}>
                    <p className="text-5xl select-none">🩷💙</p>
                    <p className="font-black text-3xl text-white">Level Complete!</p>

                    {/* Stars */}
                    <div className="flex gap-3">
                      {[1, 2, 3].map(s => (
                        <span key={s} className="text-4xl transition-all duration-300"
                          style={{
                            opacity: s <= stars ? 1 : 0.18,
                            filter: s <= stars ? `drop-shadow(0 0 8px ${starColors[s-1]})` : 'none',
                            transform: s <= stars ? 'scale(1.15)' : 'scale(1)',
                          }}>⭐</span>
                      ))}
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <div className="font-black text-5xl tabular-nums"
                        style={{ color: '#a855f7', textShadow: '0 0 24px rgba(168,85,247,0.6)' }}>
                        {score}
                      </div>
                      <div className="text-white/60 text-sm mt-1 font-semibold uppercase tracking-wide">points</div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <DBtn id="v-next" active={active} progress={progress} onClick={onNext}
                        className="w-full min-h-[62px] flex items-center justify-center gap-2 text-white font-black text-xl rounded-2xl"
                        style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 4px 24px rgba(168,85,247,0.5)' }}>
                        Next Level →
                      </DBtn>
                      <DBtn id="v-replay" active={active} progress={progress}
                        onClick={() => { animRef.current.phaseRef = 'playing'; setPhase('playing'); resetLevel(); }}
                        className="w-full min-h-[52px] flex items-center justify-center text-white font-bold text-lg rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                        🔄 Replay
                      </DBtn>
                      <DBtn id="v-levels" active={active} progress={progress} onClick={onQuit}
                        className="w-full min-h-[48px] flex items-center justify-center text-white font-bold text-base rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.18)' }}>
                        📋 Level Select
                      </DBtn>
                    </div>
                  </div>
                )}
              </DwellLayer>
            </div>
          )}

          {/* Failure overlay */}
          {phase === 'failure' && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
              <DwellLayer>
                {({ hand: _h, active, progress }) => (
                  <div className="flex flex-col items-center gap-4 px-10 py-7 rounded-3xl"
                    style={{ background: 'rgba(15,8,32,0.97)', border: '2px solid rgba(239,68,68,0.5)' }}>
                    <p className="text-5xl">😢</p>
                    <p className="font-black text-3xl text-white">Oh no!</p>
                    <p className="text-white/60 text-sm">A ball fell off the edge</p>
                    <div className="flex flex-col gap-3 w-full min-w-[280px]">
                      <DBtn id="f-retry" active={active} progress={progress}
                        onClick={() => { animRef.current.phaseRef = 'playing'; setPhase('playing'); resetLevel(); }}
                        className="w-full min-h-[62px] flex items-center justify-center gap-2 text-white font-black text-xl rounded-2xl"
                        style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', boxShadow: '0 4px 24px rgba(168,85,247,0.4)' }}>
                        🔄 Try Again
                      </DBtn>
                      <DBtn id="f-quit" active={active} progress={progress} onClick={onQuit}
                        className="w-full min-h-[52px] flex items-center justify-center text-white font-bold text-lg rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                        📋 Level Select
                      </DBtn>
                    </div>
                  </div>
                )}
              </DwellLayer>
            </div>
          )}
        </div>
      </div>

      {/* Hidden camera feed */}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,    setScreen]    = useState<Screen>('landing');
  const [levelId,   setLevelId]   = useState(1);
  const [save,      setSave]      = useState<SaveData>(loadSave);

  function persistSave(next: SaveData) {
    writeSave(next);
    setSave(next);
  }

  function handleComplete(stars: number, sc: number) {
    const next: SaveData = {
      ...save,
      stars:         { ...save.stars,    [levelId]: Math.max(save.stars[levelId] ?? 0, stars) },
      bestInk:       { ...save.bestInk,  [levelId]: Math.max(save.bestInk[levelId] ?? 0, sc) },
      unlockedLevels: save.unlockedLevels.includes(levelId + 1)
        ? save.unlockedLevels
        : [...save.unlockedLevels, Math.min(levelId + 1, TOTAL_LEVELS)],
    };
    persistSave(next);
  }

  function handleNext() {
    const nextId = Math.min(levelId + 1, TOTAL_LEVELS);
    setLevelId(nextId);
    setScreen('game');
  }

  if (screen === 'landing')
    return <LandingScreen save={save} onPlay={() => setScreen('levelselect')} onHow={() => setScreen('howtoplay')} />;

  if (screen === 'howtoplay')
    return <HowToPlayScreen onBack={() => setScreen('landing')} />;

  if (screen === 'levelselect')
    return (
      <LevelSelectScreen save={save}
        onSelect={(id) => { setLevelId(id); setScreen('game'); }}
        onBack={() => setScreen('landing')} />
    );

  if (screen === 'game')
    return (
      <GameScreen
        levelId={levelId}
        save={save}
        onComplete={handleComplete}
        onQuit={() => setScreen('levelselect')}
        onNext={handleNext}
      />
    );

  return null;
}
