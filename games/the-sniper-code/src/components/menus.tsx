import { useCallback, useEffect, useRef, useState } from 'react';
import { useMenuHand } from '../hooks/useMediaPipe';
import { DWELL_MS, type Settings } from '../utils/constants';
import { MISSIONS, ENVIRONMENTS, type MissionDef } from '../data/missions';
import type { Progress } from '../utils/storage';
import type { MissionResult } from '../game/engine';
import * as snd from '../utils/audio';

const CURSOR_R = 26;

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
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(220,38,38,0.4)" strokeWidth="2.5" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={8} fill="#dc2626" fillOpacity="0.92" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={3.5} fill="white" fillOpacity="0.9" />
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
        style={{ width: `${isAct ? progress * 100 : 0}%`, background: 'linear-gradient(90deg,#b91c1c,#ef4444)', opacity: isAct ? 1 : 0 }} />
    </div>
  );
}

function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

const PANEL_BG = 'linear-gradient(160deg,#0a0e1c 0%,#141a33 55%,#0a0e1c 100%)';

// ── Landing ───────────────────────────────────────────────────────────────────
export function Landing({ progress, onCampaign, onEndless, onHowTo, onSettings }: {
  progress: Progress; onCampaign: () => void; onEndless: () => void; onHowTo: () => void; onSettings: () => void;
}) {
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="text-center mb-8">
            <div className="text-6xl mb-2">🎯</div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white">THE SNIPER CODE</h1>
            <p className="text-red-300/80 mt-2 tracking-widest text-sm uppercase">Gesture-Only Marksman</p>
            <p className="text-white/50 text-sm mt-3">★ {totalStars} / {MISSIONS.length * 3} &nbsp;·&nbsp; Best run unlocks: Mission {progress.unlocked + 1}</p>
          </div>
          <div className="flex flex-col gap-3 w-80">
            <DBtn id="campaign" active={active} progress={p} onClick={onCampaign}
              className="py-4 rounded-2xl text-xl font-bold text-white" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>
              🎯 Campaign
            </DBtn>
            <DBtn id="endless" active={active} progress={p} onClick={onEndless}
              className="py-4 rounded-2xl text-xl font-bold text-white bg-white/10 border border-white/15">
              ♾️ Endless &nbsp;<span className="text-white/50 text-base">(best {progress.endlessHigh})</span>
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
          <p className="text-white/40 text-xs mt-8">Move your hand to aim · Pinch to fire · Open palm to zoom · Hold still to steady</p>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Mission select ──────────────────────────────────────────────────────────────
export function MissionSelect({ progress, onPick, onBack }: {
  progress: Progress; onPick: (idx: number) => void; onBack: () => void;
}) {
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center px-6 py-8 overflow-auto" style={{ background: PANEL_BG }}>
          <h2 className="text-3xl font-extrabold text-white mb-1">Select Mission</h2>
          <p className="text-white/50 text-sm mb-6">Earn at least 1 star to unlock the next.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-4xl w-full">
            {MISSIONS.map((m) => {
              const locked = m.index > progress.unlocked;
              const stars = progress.stars[m.id] ?? 0;
              const env = ENVIRONMENTS[m.env];
              return (
                <DBtn key={m.id} id={`m-${m.index}`} active={active} progress={p}
                  onClick={() => { if (!locked) onPick(m.index); }}
                  className={`aspect-[4/3] rounded-2xl p-3 flex flex-col justify-between text-left border ${locked ? 'opacity-40 border-white/10 bg-black/30' : 'border-white/15 bg-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{locked ? '🔒' : env.emoji}</span>
                    <span className="text-white/40 text-xs">#{m.index + 1}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm leading-tight">{m.name}</div>
                    <div className="text-white/45 text-[11px]">{env.name}</div>
                    <div className="text-amber-300 mt-1"><Stars n={stars} size={14} /></div>
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

// ── Briefing ─────────────────────────────────────────────────────────────────
export function Briefing({ mission, onStart, onBack }: { mission: MissionDef; onStart: () => void; onBack: () => void }) {
  const env = ENVIRONMENTS[mission.env];
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="max-w-lg w-full bg-black/40 border border-white/10 rounded-3xl p-7 text-center">
            <div className="text-5xl mb-2">{env.emoji}</div>
            <div className="text-red-300/70 text-xs uppercase tracking-widest">Mission {mission.index + 1} · {env.name}</div>
            <h2 className="text-3xl font-extrabold text-white mb-1">{mission.name}</h2>
            <div className="text-amber-200 font-semibold mb-3">{mission.objective}</div>
            <p className="text-white/70 text-sm leading-relaxed mb-5">{mission.brief}</p>
            <div className="flex justify-center gap-4 text-white/60 text-xs mb-6">
              <span>⏱ {mission.timeSec}s</span>
              <span>🔫 {mission.bullets < 0 ? '∞' : mission.bullets} shots</span>
              {mission.night && <span>🌙 Night</span>}
              {mission.fog > 0 && <span>🌫 Fog</span>}
              {mission.wind !== 0 && <span>💨 Wind</span>}
            </div>
            <div className="flex gap-3">
              <DBtn id="back" active={active} progress={p} onClick={onBack}
                className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">← Back</DBtn>
              <DBtn id="start" active={active} progress={p} onClick={onStart}
                className="flex-[2] py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>
                ▶ Start Mission
              </DBtn>
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Tutorial ─────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { icon: '✋', title: 'Move to aim', text: 'Move your hand to pan the scope. The crosshair stays centred — line it up on your target.' },
  { icon: '🤏', title: 'Pinch to fire', text: 'Touch your thumb and index finger together to take the shot. There is a short cooldown — no spamming.' },
  { icon: '🖐️', title: 'Open palm to zoom', text: 'Hold an open palm for a moment to cycle 2× → 4× → 8× magnification for far targets.' },
  { icon: '🧘', title: 'Hold steady', text: 'Keep your hand very still to engage STEADY AIM — less sway, clearer view, bonus points.' },
  { icon: '🚫', title: 'Spare civilians', text: 'Only shoot the suspect marked with a red ◆ diamond. Hitting a civilian, VIP or decoy fails the mission.' },
  { icon: '🎯', title: 'Complete the objective', text: 'Clear every marked target before the timer or ammo runs out. Earn up to ★★★ per mission.' },
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
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-red-500' : 'w-1.5 bg-white/25'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              {!last && (
                <DBtn id="skip" active={active} progress={p} onClick={onDone}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">Skip</DBtn>
              )}
              <DBtn id="next" active={active} progress={p} onClick={() => (last ? onDone() : setStep(step + 1))}
                className="flex-[2] py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>
                {last ? "Let's go ▶" : 'Next →'}
              </DBtn>
            </div>
          </div>
        </div>
      )}
    </DwellLayer>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────
export function Results({ result, mission, best, hasNext, onNext, onRetry, onMenu }: {
  result: MissionResult; mission: MissionDef; best: number;
  hasNext: boolean; onNext: () => void; onRetry: () => void; onMenu: () => void;
}) {
  useEffect(() => {
    if (result.win) result.stars && [...Array(result.stars)].forEach((_, i) => snd.playStar(i));
  }, [result]);
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="max-w-md w-full bg-black/45 border border-white/10 rounded-3xl p-7 text-center">
            <h2 className={`text-3xl font-extrabold mb-1 ${result.win ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.win ? 'MISSION COMPLETE' : 'MISSION FAILED'}
            </h2>
            <p className="text-white/60 text-sm mb-3">{result.reason}</p>
            <div className="text-amber-300 text-4xl mb-3">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ opacity: i < result.stars ? 1 : 0.2, display: 'inline-block', animation: i < result.stars ? `starPop .5s ease-out ${i * 0.15}s both` : undefined }}>★</span>
              ))}
            </div>
            <div className="text-5xl font-black text-white mb-1">{result.score.toLocaleString()}</div>
            <div className="text-white/50 text-xs mb-4">Best: {Math.max(best, result.score).toLocaleString()}</div>

            <div className="grid grid-cols-2 gap-2 text-left text-sm mb-5">
              <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
              <Stat label="Headshots" value={String(result.headshots)} />
              <Stat label="Shots fired" value={String(result.shots)} />
              <Stat label="Max combo" value={`×${result.maxCombo}`} />
              {result.win && <Stat label="Time bonus" value={`+${result.bonuses.time}`} />}
              {result.win && <Stat label="Ammo bonus" value={`+${result.bonuses.bullets}`} />}
              {result.win && result.bonuses.steady > 0 && <Stat label="Steady bonus" value={`+${result.bonuses.steady}`} />}
              {result.win && result.bonuses.perfect > 0 && <Stat label="Perfect!" value={`+${result.bonuses.perfect}`} />}
            </div>

            <div className="flex flex-col gap-2">
              {result.win && hasNext && (
                <DBtn id="next" active={active} progress={p} onClick={onNext}
                  className="py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>Next Mission →</DBtn>
              )}
              <div className="flex gap-2">
                <DBtn id="retry" active={active} progress={p} onClick={onRetry}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">↻ Retry</DBtn>
                <DBtn id="menu" active={active} progress={p} onClick={onMenu}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">☰ Menu</DBtn>
              </div>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-4">{mission.name}</p>
        </div>
      )}
    </DwellLayer>
  );
}

export function EndlessOver({ wave, score, best, onAgain, onMenu }: {
  wave: number; score: number; best: number; onAgain: () => void; onMenu: () => void;
}) {
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6" style={{ background: PANEL_BG }}>
          <div className="max-w-sm w-full bg-black/45 border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-5xl mb-2">♾️</div>
            <h2 className="text-3xl font-extrabold text-white mb-1">Endless Over</h2>
            <p className="text-white/60 text-sm mb-4">You cleared {wave} wave{wave === 1 ? '' : 's'}.</p>
            <div className="text-5xl font-black text-white">{score.toLocaleString()}</div>
            <div className="text-white/50 text-xs mb-5">Best: {Math.max(best, score).toLocaleString()}</div>
            <div className="flex flex-col gap-2">
              <DBtn id="again" active={active} progress={p} onClick={onAgain}
                className="py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>↻ Play Again</DBtn>
              <DBtn id="menu" active={active} progress={p} onClick={onMenu}
                className="py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">☰ Menu</DBtn>
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
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)) * 100) / 100;
  return (
    <DwellLayer>
      {({ active, progress: p }) => (
        <div className="min-h-screen w-screen flex flex-col items-center px-6 py-8 overflow-auto" style={{ background: PANEL_BG }}>
          <h2 className="text-3xl font-extrabold text-white mb-6">Settings</h2>
          <div className="w-full max-w-md flex flex-col gap-3">
            <NumRow label="Sensitivity" value={settings.sensitivity.toFixed(2)} active={active} p={p}
              onDec={() => set({ sensitivity: clamp(settings.sensitivity - 0.1, 0.6, 1.6) })}
              onInc={() => set({ sensitivity: clamp(settings.sensitivity + 0.1, 0.6, 1.6) })} id="sens" />
            <NumRow label="Hand smoothing" value={settings.smoothing.toFixed(2)} active={active} p={p}
              onDec={() => set({ smoothing: clamp(settings.smoothing - 0.04, 0.1, 0.4) })}
              onInc={() => set({ smoothing: clamp(settings.smoothing + 0.04, 0.1, 0.4) })} id="smooth" />
            <NumRow label="Scope darkness" value={settings.scopeOpacity.toFixed(2)} active={active} p={p}
              onDec={() => set({ scopeOpacity: clamp(settings.scopeOpacity - 0.05, 0.5, 0.95) })}
              onInc={() => set({ scopeOpacity: clamp(settings.scopeOpacity + 0.05, 0.5, 0.95) })} id="opac" />
            <ToggleRow label="Sound" on={settings.sound} active={active} p={p} id="sound" onToggle={() => set({ sound: !settings.sound })} />
            <ToggleRow label="Left-handed HUD" on={settings.leftHanded} active={active} p={p} id="left" onToggle={() => set({ leftHanded: !settings.leftHanded })} />
            <ToggleRow label="High contrast markers" on={settings.highContrast} active={active} p={p} id="hc" onToggle={() => set({ highContrast: !settings.highContrast })} />
            <ToggleRow label="Aim assist" on={settings.aimAssist} active={active} p={p} id="assist" onToggle={() => set({ aimAssist: !settings.aimAssist })} />
            <DBtn id="tut" active={active} progress={p} onClick={onTutorial}
              className="py-3 rounded-2xl font-semibold text-white bg-white/10 border border-white/15">↻ Replay Tutorial</DBtn>
            <DBtn id="back" active={active} progress={p} onClick={onBack}
              className="py-3 rounded-2xl font-bold text-white mt-2" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444)' }}>✓ Done</DBtn>
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
