import { useEffect, useRef, useState } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { GameEngine, type HudState, type MissionResult } from '../game/engine';
import { HUD_DWELL_MS, type Settings } from '../utils/constants';
import type { MissionDef } from '../data/missions';
import * as snd from '../utils/audio';

const EMPTY_HUD: HudState = {
  objective: '', timeLeft: 0, bullets: -1, combo: 1, zoom: 2, steady: false,
  wind: 0, showWind: false, targetsLeft: 0, mode: 'play', handDetected: false,
  banner: null, leftHanded: false,
};

export default function GameScreen({
  mission, settings, onComplete, onQuit, onRestart,
}: {
  mission: MissionDef;
  settings: Settings;
  onComplete: (r: MissionResult) => void;
  onQuit: () => void;
  onRestart: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handRef = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [cursor, setCursor] = useState<{ x: number; y: number; on: boolean }>({ x: 0, y: 0, on: false });
  const [dwell, setDwell] = useState<{ id: string | null; p: number }>({ id: null, p: 0 });

  // dwell bookkeeping
  const dwellId = useRef<string | null>(null);
  const dwellStart = useRef<number | null>(null);

  useEffect(() => {
    snd.initAudio();
    snd.setMuted(!settings.sound);
    snd.startAmbience();
    const engine = new GameEngine(mission, settings, onComplete);
    engineRef.current = engine;

    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // per-frame UI state held in refs; flushed to React at ~20fps to avoid churn
    const cursorNow = { x: 0, y: 0, on: false };
    const dwellNow = { id: null as string | null, p: 0 };

    function frame(now: number) {
      const dt = Math.min(50, now - last);
      last = now;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      }
      engine.resize(cw, ch);

      engine.update(dt, handRef.current);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      engine.render(ctx);

      runDwell(now, cw, ch);

      uiAcc += dt;
      if (uiAcc >= 50) {
        uiAcc = 0;
        setHud(engine.getHud());
        setCursor({ ...cursorNow });
        setDwell({ ...dwellNow });
      }

      raf = requestAnimationFrame(frame);
    }

    function runDwell(now: number, cw: number, ch: number) {
      const h = handRef.current;
      cursorNow.x = h.detected ? h.cursorX * cw : -1;
      cursorNow.y = h.detected ? h.cursorY * ch : -1;
      cursorNow.on = h.detected;

      if (!h.detected) { dwellId.current = null; dwellStart.current = null; dwellNow.id = null; dwellNow.p = 0; return; }
      let hov: string | null = null;
      document.querySelectorAll('[data-hud-id]').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (cursorNow.x >= r.left && cursorNow.x <= r.right && cursorNow.y >= r.top && cursorNow.y <= r.bottom)
          hov = (el as HTMLElement).dataset.hudId!;
      });
      if (hov !== dwellId.current) {
        dwellId.current = hov; dwellStart.current = hov ? now : null; dwellNow.id = hov; dwellNow.p = 0;
      } else if (hov && dwellStart.current !== null) {
        dwellNow.id = hov;
        dwellNow.p = Math.min((now - dwellStart.current) / HUD_DWELL_MS, 1);
        if (dwellNow.p >= 1) {
          (document.querySelector(`[data-hud-id="${hov}"]`) as HTMLElement | null)?.click();
          dwellStart.current = null; dwellId.current = null; dwellNow.id = null; dwellNow.p = 0;
        }
      }
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); snd.stopAmbience(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);

  useEffect(() => { engineRef.current?.setSettings(settings); snd.setMuted(!settings.sound); }, [settings]);

  const paused = hud.mode === 'paused';
  const side = settings.leftHanded ? 'left-4' : 'right-4';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video ref={videoRef} className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {/* top bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <Pill label="TIME" value={`${hud.timeLeft}s`} danger={hud.timeLeft <= 5} />
          <Pill label="AMMO" value={hud.bullets < 0 ? '∞' : String(hud.bullets)} danger={hud.bullets === 1} />
          <Pill label="COMBO" value={`×${hud.combo}`} accent={hud.combo > 1} />
          <Pill label="ZOOM" value={`${hud.zoom}×`} />
          {hud.showWind && <WindPill wind={hud.wind} />}
        </div>

        {/* objective */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[11px] uppercase tracking-widest text-red-300/80">{mission.name}</div>
          <div className="text-sm text-white/90 font-semibold">{hud.objective}</div>
          <div className="text-[11px] text-white/60">Targets left: {hud.targetsLeft}</div>
        </div>

        {/* steady badge */}
        {hud.steady && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-sm font-semibold"
            style={{ animation: 'blink 1.2s ease-in-out infinite' }}>
            ● STEADY AIM
          </div>
        )}

        {/* hand status */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${hud.handDetected ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-white/70 text-xs font-medium">{hud.handDetected ? 'Hand tracked' : 'Show your hand'}</span>
        </div>

        {/* banner */}
        {hud.banner && (
          <div key={hud.banner} className="absolute top-28 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl bg-black/55 border border-red-500/40 text-red-200 text-lg font-bold"
            style={{ animation: 'bannerSlide 2.6s ease-out forwards' }}>
            {hud.banner}
          </div>
        )}
      </div>

      {/* pause button (dwellable) */}
      {!paused && (
        <button data-hud-id="pause"
          onClick={(e) => { if (e.isTrusted) return; engineRef.current?.pause(); }}
          className={`absolute top-3 ${side} w-12 h-12 rounded-full bg-black/55 border border-white/20 text-white text-lg flex items-center justify-center`}
          style={{ cursor: 'default' }}>
          <span style={{ letterSpacing: '-2px' }}>❚❚</span>
          <DwellRing show={dwell.id === 'pause'} p={dwell.p} />
        </button>
      )}

      {/* pause overlay */}
      {paused && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">PAUSED</h2>
          <HudBtn id="resume" label="▶  Resume" dwell={dwell} onClick={() => engineRef.current?.resume()} />
          <HudBtn id="restart" label="↻  Restart" dwell={dwell} onClick={onRestart} />
          <HudBtn id="quit" label="✕  Quit to Menu" dwell={dwell} onClick={onQuit} />
          <p className="text-white/50 text-sm mt-2">Hover a button for one second to select.</p>
        </div>
      )}

      {/* HUD cursor */}
      {cursor.on && (
        <div className="pointer-events-none fixed z-50"
          style={{ left: cursor.x - 14, top: cursor.y - 14, width: 28, height: 28 }}>
          <div className="w-full h-full rounded-full border-2 border-red-400/60 bg-red-500/20" />
        </div>
      )}
    </div>
  );
}

function Pill({ label, value, danger, accent }: { label: string; value: string; danger?: boolean; accent?: boolean }) {
  return (
    <div className={`px-3 py-1 rounded-lg bg-black/55 border ${danger ? 'border-red-500/70' : accent ? 'border-amber-400/60' : 'border-white/15'} text-center min-w-[58px]`}>
      <div className="text-[9px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={`text-sm font-bold ${danger ? 'text-red-400' : accent ? 'text-amber-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function WindPill({ wind }: { wind: number }) {
  const dir = wind > 0 ? '→' : '←';
  const strength = Math.round(Math.abs(wind) * 10);
  return (
    <div className="px-3 py-1 rounded-lg bg-black/55 border border-sky-400/40 text-center min-w-[58px]">
      <div className="text-[9px] uppercase tracking-widest text-white/50">Wind</div>
      <div className="text-sm font-bold text-sky-300">{dir} {strength}</div>
    </div>
  );
}

function DwellRing({ show, p }: { show: boolean; p: number }) {
  if (!show) return null;
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg className="absolute -inset-1 pointer-events-none" width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#dc2626" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 28 28)" />
    </svg>
  );
}

function HudBtn({ id, label, dwell, onClick }: { id: string; label: string; dwell: { id: string | null; p: number }; onClick: () => void }) {
  const active = dwell.id === id;
  return (
    <button data-hud-id={id}
      onClick={(e) => { if (e.isTrusted) return; onClick(); }}
      className={`relative w-72 py-3 rounded-xl text-lg font-semibold border transition-all ${active ? 'bg-red-600/30 border-red-400 scale-[1.03]' : 'bg-white/10 border-white/20'} text-white`}
      style={{ cursor: 'default' }}>
      {label}
      <div className="absolute bottom-0 left-0 h-1 rounded-full bg-red-500" style={{ width: active ? `${dwell.p * 100}%` : 0 }} />
    </button>
  );
}
