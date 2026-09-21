import { useCallback, useEffect, useRef, useState } from 'react';
import { useMenuHand } from '../hooks/useMediaPipe';
import { DWELL_MS, type Settings } from '../utils/constants';
import { MODES, type ModeDef, type ModeId } from '../data/modes';
import { SKINS } from '../data/skins';
import { ACHIEVEMENTS } from '../data/achievements';
import type { Progress } from '../utils/storage';
import type { RunResult } from '../game/engine';
import * as snd from '../utils/audio';

const CURSOR_R = 24;
const PANEL_BG = 'linear-gradient(165deg,#161021 0%,#241a33 50%,#120d1c 100%)';
const PRIMARY = 'linear-gradient(90deg,#d97706,#f59e0b)';

// ── DwellLayer ────────────────────────────────────────────────────────────────
export function DwellLayer({ children }: {
  children: (p: { active: string | null; progress: number }) => React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hand = useMenuHand(videoRef as React.RefObject<HTMLVideoElement>);
  const handRef = useRef(hand); handRef.current = hand;
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const activeRef = useRef<string | null>(null);
  const rafRef = useRef(0);

  const loop = useCallback((ts: number) => {
    const h = handRef.current;
    if (!h.detected) {
      setActive(null); setProgress(0); dwellStart.current = null; activeRef.current = null;
      rafRef.current = requestAnimationFrame(loop); return;
    }
    const cx = h.x * window.innerWidth;
    const cy = h.y * window.innerHeight;
    let hov: string | null = null;
    document.querySelectorAll('[data-dwell-id]').forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) hov = (el as HTMLElement).dataset.dwellId!;
    });
    if (hov !== activeRef.current) {
      activeRef.current = hov; setActive(hov); dwellStart.current = hov ? ts : null; setProgress(0);
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

  useEffect(() => { rafRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(rafRef.current); }, [loop]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
      {children({ active, progress })}
      {hand.detected && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: hand.x * window.innerWidth - CURSOR_R, top: hand.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}>
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="2.5" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={7} fill="#f59e0b" fillOpacity="0.92" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={3} fill="white" fillOpacity="0.9" />
          </svg>
        </div>
      )}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${hand.detected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white/70 text-xs font-medium">{hand.detected ? 'Hand tracked' : 'Show your hand'}</span>
      </div>
    </div>
  );
}

export function DBtn({ id, active, progress, onClick, className = '', style, children }: {
  id: string; active: string | null; progress: number; onClick: () => void;
  className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  const isAct = active === id;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button data-dwell-id={id}
        onClick={(e) => { if (e.isTrusted) return; snd.initAudio(); onClick(); }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none', ...style }}
        className={`${className} ${isAct ? 'brightness-125 scale-[1.03]' : ''} transition-all duration-150 relative`}>
        {children}
      </button>
      <div className="absolute bottom-0 left-0 h-1.5 pointer-events-none"
        style={{ width: `${isAct ? progress * 100 : 0}%`, background: PRIMARY, opacity: isAct ? 1 : 0 }} />
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
export function Landing({ progress, onPlay, onShop, onHowTo, onSettings }: {
  progress: Progress; onPlay: () => void; onShop: () => void; onHowTo: () => void; onSettings: () => void;
}) {
  const best = progress.highScore['endless'] ?? 0;
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="text-center mb-7">
            <div className="text-6xl mb-1" style={{ animation: 'floatY 3s ease-in-out infinite' }}>🛡️🗡️</div>
            <h1 className="text-5xl font-black tracking-tight text-amber-300">SPEAR STICKMAN</h1>
            <p className="text-orange-300/80 mt-2 tracking-widest text-sm uppercase">Gesture-Only Survival</p>
            <p className="text-white/50 text-sm mt-3">
              🏆 Best {best.toLocaleString()} &nbsp;·&nbsp; 🌊 Wave {progress.bestWave} &nbsp;·&nbsp; 🪙 {progress.coins}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-80">
            <DBtn id="play" active={active} progress={p} onClick={onPlay}
              className="py-4 rounded-2xl text-xl font-bold text-white" style={{ background: PRIMARY }}>
              ⚔️ Play
            </DBtn>
            <DBtn id="shop" active={active} progress={p} onClick={onShop}
              className="py-3 rounded-2xl text-lg font-bold text-white bg-white/10 border border-white/15">
              🛒 Spear Shop
            </DBtn>
            <div className="flex gap-3">
              <DBtn id="howto" active={active} progress={p} onClick={onHowTo}
                className="flex-1 py-3 rounded-2xl text-base font-semibold text-white bg-white/10 border border-white/15">
                ❔ How to Play
              </DBtn>
              <DBtn id="settings" active={active} progress={p} onClick={onSettings}
                className="flex-1 py-3 rounded-2xl text-base font-semibold text-white bg-white/10 border border-white/15">
                ⚙️ Settings
              </DBtn>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-7 text-center max-w-md">
            Move your hand to aim · Make a fist to charge, release to throw · Pinch for a quick throw · Swipe to dodge
          </p>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Mode select ─────────────────────────────────────────────────────────────────
export function ModeSelect({ progress, onPick, onBack }: {
  progress: Progress; onPick: (id: ModeId) => void; onBack: () => void;
}) {
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center px-6 py-8" style={{ background: PANEL_BG }}>
          <h2 className="text-3xl font-extrabold text-white mb-1">Choose a Mode</h2>
          <p className="text-white/50 text-sm mb-6">Survive the waves. Endless is the main event.</p>
          <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
            {MODES.map((m) => (
              <DBtn key={m.id} id={`mode-${m.id}`} active={active} progress={p} onClick={() => onPick(m.id)}
                className="rounded-2xl p-4 text-left border border-white/15 bg-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-amber-300 text-xs font-bold">Best {(progress.highScore[m.id] ?? 0).toLocaleString()}</span>
                </div>
                <div className="text-white font-bold text-lg">{m.name}</div>
                <div className="text-white/55 text-xs leading-snug mt-0.5">{m.blurb}</div>
              </DBtn>
            ))}
          </div>
          <div className="mt-6 w-60">
            <DBtn id="back" active={active} progress={p} onClick={onBack}
              className="py-3 rounded-2xl text-base font-semibold text-white bg-white/10 border border-white/15 w-full">← Back</DBtn>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Tutorial ─────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { icon: '✋', title: 'Move to aim', text: 'Move your hand to aim. The arc preview shows where your spear will fly.' },
  { icon: '✊', title: 'Charge & throw', text: 'Make a fist to draw back — the power meter fills. Open your hand to release a powerful throw.' },
  { icon: '🤏', title: 'Quick throw', text: 'Pinch thumb and index for a fast, lighter throw when enemies are close.' },
  { icon: '🎯', title: 'Headshots', text: 'Aim for the head! A headshot defeats almost any enemy instantly and scores double.' },
  { icon: '↔️', title: 'Dodge', text: 'Swipe your hand quickly sideways to dodge — you briefly become invulnerable to incoming spears.' },
  { icon: '🎁', title: 'Power-ups & combos', text: 'Defeated enemies drop power-ups that fly to you. Chain kills without getting hit to build a big combo.' },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const last = step >= TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[step];
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="max-w-md w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-3">{s.icon}</div>
            <h2 className="text-2xl font-extrabold text-white mb-2">{s.title}</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-2">{s.text}</p>
            <div className="flex justify-center gap-1.5 my-5">
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-amber-500' : 'w-1.5 bg-white/25'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              {!last && (
                <DBtn id="skip" active={active} progress={p} onClick={onDone}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">Skip</DBtn>
              )}
              <DBtn id="next" active={active} progress={p} onClick={() => (last ? onDone() : setStep(step + 1))}
                className="flex-[2] py-3 rounded-2xl font-bold text-white" style={{ background: PRIMARY }}>
                {last ? "Let's go ⚔️" : 'Next →'}
              </DBtn>
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Shop ─────────────────────────────────────────────────────────────────────
export function Shop({ progress, onBuy, onSelect, onBack }: {
  progress: Progress; onBuy: (id: string) => void; onSelect: (id: string) => void; onBack: () => void;
}) {
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center px-6 py-8" style={{ background: PANEL_BG }}>
          <h2 className="text-3xl font-extrabold text-white mb-1">Spear Shop</h2>
          <p className="text-amber-300 text-sm mb-6 font-bold">🪙 {progress.coins} coins</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl w-full">
            {SKINS.map((sk) => {
              const owned = progress.unlockedSkins.includes(sk.id);
              const selected = progress.selectedSkin === sk.id;
              const afford = progress.coins >= sk.cost;
              return (
                <DBtn key={sk.id} id={`skin-${sk.id}`} active={active} progress={p}
                  onClick={() => (owned ? onSelect(sk.id) : afford ? onBuy(sk.id) : undefined)}
                  className={`rounded-2xl p-3 flex flex-col items-center border ${selected ? 'border-amber-400 bg-amber-500/15' : owned ? 'border-white/20 bg-white/10' : afford ? 'border-white/12 bg-black/30' : 'border-white/8 bg-black/30 opacity-55'}`}>
                  <div className="text-3xl mb-1">{sk.emoji}</div>
                  <div className="h-1.5 w-12 rounded-full mb-1.5" style={{ background: sk.tip }} />
                  <div className="text-white text-xs font-bold text-center leading-tight">{sk.name}</div>
                  <div className="text-[11px] mt-1 font-semibold">
                    {selected ? <span className="text-amber-300">✓ Equipped</span>
                      : owned ? <span className="text-emerald-300">Tap to equip</span>
                        : <span className={afford ? 'text-white/70' : 'text-red-300/70'}>🪙 {sk.cost}</span>}
                  </div>
                </DBtn>
              );
            })}
          </div>
          <div className="mt-6 w-60">
            <DBtn id="back" active={active} progress={p} onClick={onBack}
              className="py-3 rounded-2xl text-base font-semibold text-white bg-white/10 border border-white/15 w-full">← Back</DBtn>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────
export function Results({ result, mode, best, newBest, unlocked, onRetry, onMenu }: {
  result: RunResult; mode: ModeDef; best: number; newBest: boolean; unlocked: string[];
  onRetry: () => void; onMenu: () => void;
}) {
  useEffect(() => { snd.playStar(0); if (newBest) snd.playStar(1); }, [newBest]);
  const newAch = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id));
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center px-6 py-8" style={{ background: PANEL_BG }}>
          <div className="max-w-md w-full bg-black/45 border border-white/10 rounded-3xl p-7 text-center">
            <h2 className="text-3xl font-extrabold mb-1 text-red-400">GAME OVER</h2>
            <p className="text-white/55 text-sm mb-1">{result.reason} · {mode.name}</p>
            <div className="text-5xl font-black text-amber-300 mt-2 mb-1" style={{ animation: 'popIn .3s ease-out' }}>
              {result.score.toLocaleString()}
            </div>
            <div className="text-white/50 text-xs mb-4">
              {newBest ? <span className="text-emerald-300 font-bold">★ NEW BEST!</span> : `Best: ${best.toLocaleString()}`}
            </div>

            <div className="grid grid-cols-2 gap-2 text-left text-sm mb-4">
              <Stat label="Wave reached" value={String(result.wave)} />
              <Stat label="Enemies" value={String(result.kills)} />
              <Stat label="Headshots" value={String(result.headshots)} />
              <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
              <Stat label="Max combo" value={`×${result.maxCombo}`} />
              <Stat label="Bosses" value={String(result.bossKills)} />
              <Stat label="Perfect waves" value={String(result.perfectWaves)} />
              <Stat label="Coins earned" value={`🪙 ${result.coinsEarned}`} />
            </div>

            {newAch.length > 0 && (
              <div className="mb-4 text-left">
                <div className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">New Achievements</div>
                {newAch.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-1.5 mb-1"
                    style={{ animation: 'popIn .3s ease-out' }}>
                    <span className="text-xl">{a.emoji}</span>
                    <div><div className="text-white text-sm font-bold leading-tight">{a.name}</div>
                      <div className="text-white/50 text-[11px]">{a.desc}</div></div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <DBtn id="retry" active={active} progress={p} onClick={onRetry}
                className="flex-[2] py-3 rounded-2xl font-bold text-white" style={{ background: PRIMARY }}>↻ Play Again</DBtn>
              <DBtn id="menu" active={active} progress={p} onClick={onMenu}
                className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">☰ Menu</DBtn>
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-1.5 flex justify-between">
      <span className="text-white/50">{label}</span><span className="text-white font-semibold">{value}</span>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function SettingsScreen({ settings, onChange, onTutorial, onBack }: {
  settings: Settings; onChange: (s: Settings) => void; onTutorial: () => void; onBack: () => void;
}) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center px-6 py-8" style={{ background: PANEL_BG }}>
          <h2 className="text-3xl font-extrabold text-white mb-6">Settings</h2>
          <div className="w-full max-w-md flex flex-col gap-3">
            <NumRow id="sens" label="Aim sensitivity" value={settings.sensitivity.toFixed(2)} active={active} p={p}
              onDec={() => set({ sensitivity: round(Math.max(0.6, settings.sensitivity - 0.1)) })}
              onInc={() => set({ sensitivity: round(Math.min(1.6, settings.sensitivity + 0.1)) })} />
            <NumRow id="smooth" label="Hand smoothing" value={settings.smoothing.toFixed(2)} active={active} p={p}
              onDec={() => set({ smoothing: round(Math.max(0.12, settings.smoothing - 0.04)) })}
              onInc={() => set({ smoothing: round(Math.min(0.45, settings.smoothing + 0.04)) })} />
            <SegRow id="throw" label="Throw control" active={active} p={p}
              options={[['charge', 'Fist'], ['quick', 'Pinch'], ['both', 'Both']]}
              value={settings.throwMode} onPick={(v) => set({ throwMode: v as Settings['throwMode'] })} />
            <ToggleRow id="sound" label="Sound" on={settings.sound} active={active} p={p} onToggle={() => set({ sound: !settings.sound })} />
            <ToggleRow id="left" label="Left-handed HUD" on={settings.leftHanded} active={active} p={p} onToggle={() => set({ leftHanded: !settings.leftHanded })} />
            <ToggleRow id="hc" label="High contrast" on={settings.highContrast} active={active} p={p} onToggle={() => set({ highContrast: !settings.highContrast })} />
            <ToggleRow id="assist" label="Aim assist" on={settings.aimAssist} active={active} p={p} onToggle={() => set({ aimAssist: !settings.aimAssist })} />
            <DBtn id="tut" active={active} progress={p} onClick={onTutorial}
              className="py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">↻ Replay Tutorial</DBtn>
            <DBtn id="back" active={active} progress={p} onClick={onBack}
              className="py-3 rounded-2xl font-bold text-white mt-2" style={{ background: PRIMARY }}>✓ Done</DBtn>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

function NumRow({ id, label, value, active, p, onDec, onInc }: {
  id: string; label: string; value: string; active: string | null; p: number; onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-2">
      <span className="text-white/80 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <DBtn id={`${id}-`} active={active} progress={p} onClick={onDec}
          className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-white text-xl font-bold flex items-center justify-center">−</DBtn>
        <span className="text-white font-bold w-14 text-center">{value}</span>
        <DBtn id={`${id}+`} active={active} progress={p} onClick={onInc}
          className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-white text-xl font-bold flex items-center justify-center">+</DBtn>
      </div>
    </div>
  );
}

function ToggleRow({ id, label, on, active, p, onToggle }: {
  id: string; label: string; on: boolean; active: string | null; p: number; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-2">
      <span className="text-white/80 font-medium">{label}</span>
      <DBtn id={id} active={active} progress={p} onClick={onToggle}
        className={`px-5 py-2 rounded-xl font-bold border ${on ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-300' : 'bg-white/10 border-white/15 text-white/60'}`}>
        {on ? 'ON' : 'OFF'}
      </DBtn>
    </div>
  );
}

function SegRow({ id, label, options, value, active, p, onPick }: {
  id: string; label: string; options: [string, string][]; value: string; active: string | null; p: number; onPick: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-2">
      <span className="text-white/80 font-medium">{label}</span>
      <div className="flex gap-1.5">
        {options.map(([v, lbl]) => (
          <DBtn key={v} id={`${id}-${v}`} active={active} progress={p} onClick={() => onPick(v)}
            className={`px-3 py-2 rounded-xl text-sm font-bold border ${value === v ? 'bg-amber-500/25 border-amber-400/60 text-amber-200' : 'bg-white/10 border-white/15 text-white/60'}`}>
            {lbl}
          </DBtn>
        ))}
      </div>
    </div>
  );
}
