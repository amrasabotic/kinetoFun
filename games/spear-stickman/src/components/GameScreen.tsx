import { useEffect, useRef, useState } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { GameEngine, POWERUPS, type HudState, type RunResult } from '../game/engine';
import { HUD_DWELL_MS, type Settings } from '../utils/constants';
import type { ModeDef } from '../data/modes';
import type { SkinDef } from '../data/skins';
import * as snd from '../utils/audio';

const EMPTY_HUD: HudState = {
  hearts: 3, maxHearts: 3, wave: 1, score: 0, combo: 1, coins: 0, timeLeft: -1,
  handDetected: false, chargeP: -1, throwReady: true, dodgeReady: true, powerups: [],
  bossHp: -1, bossName: '', banner: null, bannerKind: 'wave', mode: 'play', modeName: '',
  leftHanded: false, hint: '',
};

export default function GameScreen({
  mode, skin, settings, onComplete, onQuit, onRestart,
}: {
  mode: ModeDef;
  skin: SkinDef;
  settings: Settings;
  onComplete: (r: RunResult) => void;
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

  const dwellId = useRef<string | null>(null);
  const dwellStart = useRef<number | null>(null);

  useEffect(() => {
    snd.initAudio();
    snd.setMuted(!settings.sound);
    snd.startAmbience();
    const engine = new GameEngine(mode, skin, settings, onComplete);
    engineRef.current = engine;

    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
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
  }, []);

  useEffect(() => { engineRef.current?.setSettings(settings); snd.setMuted(!settings.sound); }, [settings]);

  const paused = hud.mode === 'paused';
  const side = settings.leftHanded ? 'left-3' : 'right-3';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video ref={videoRef} className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />
      <canvas ref={canvasRef} className="w-full h-full block" />

      <div className="pointer-events-none absolute inset-0 select-none">
        {/* top-left: hearts + wave */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-2xl leading-none">
            {Array.from({ length: hud.maxHearts }).map((_, i) => (
              <span key={i} style={{ opacity: i < hud.hearts ? 1 : 0.22, filter: i < hud.hearts ? 'none' : 'grayscale(1)' }}>❤️</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Pill label="WAVE" value={String(hud.wave)} />
            {hud.timeLeft >= 0 && <Pill label="TIME" value={fmtTime(hud.timeLeft)} danger={hud.timeLeft <= 15} />}
          </div>
        </div>

        {/* top-center: score + combo */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center">
          <div className="text-3xl font-black text-amber-300 drop-shadow">{hud.score.toLocaleString()}</div>
          {hud.combo > 1 && (
            <div className="text-sm font-bold text-orange-400" style={{ animation: 'popIn .2s ease-out' }} key={hud.combo}>
              ×{hud.combo} COMBO
            </div>
          )}
        </div>

        {/* top-right: coins + power-ups */}
        <div className={`absolute top-3 ${settings.leftHanded ? 'right-20' : 'right-20'} flex flex-col items-end gap-1.5`}>
          <div className="px-3 py-1 rounded-lg bg-black/55 border border-amber-400/40 text-amber-300 font-bold text-sm">
            🪙 {hud.coins}
          </div>
          <div className="flex gap-1.5">
            {hud.powerups.map((pu) => (
              <div key={pu.type} className="relative w-9 h-9 rounded-lg bg-black/55 border border-white/20 flex items-center justify-center text-lg overflow-hidden">
                <span>{POWERUPS[pu.type].emoji}</span>
                <div className="absolute bottom-0 left-0 h-1" style={{ width: `${pu.frac * 100}%`, background: POWERUPS[pu.type].color }} />
              </div>
            ))}
          </div>
        </div>

        {/* boss HP bar */}
        {hud.bossHp >= 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-80 max-w-[70vw]">
            <div className="text-center text-red-300 text-xs font-bold tracking-widest mb-1">👹 {hud.bossName.toUpperCase()}</div>
            <div className="h-3 rounded-full bg-black/60 border border-red-500/50 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${hud.bossHp * 100}%` }} />
            </div>
          </div>
        )}

        {/* hand status */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${hud.handDetected ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-white/70 text-xs font-medium">{hud.hint}</span>
        </div>

        {/* dodge indicator */}
        <div className={`absolute bottom-3 ${settings.leftHanded ? 'left-1/2 translate-x-24' : 'right-3'} px-3 py-1.5 rounded-full text-xs font-semibold ${hud.dodgeReady ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40' : 'bg-black/40 text-white/40 border border-white/10'}`}>
          ↔ Dodge {hud.dodgeReady ? 'Ready' : '…'}
        </div>

        {/* charge meter */}
        {hud.chargeP >= 0 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 max-w-[60vw]">
            <div className="h-3 rounded-full bg-black/60 border border-amber-400/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${hud.chargeP * 100}%` }} />
            </div>
            <div className="text-center text-amber-300 text-[11px] font-bold mt-0.5">CHARGING — release to throw</div>
          </div>
        )}

        {/* banner */}
        {hud.banner && (
          <div key={hud.banner}
            className={`absolute top-28 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl text-lg font-extrabold ${bannerCls(hud.bannerKind)}`}
            style={{ animation: 'bannerSlide 2s ease-out forwards' }}>
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
        <div className="pointer-events-none fixed z-50" style={{ left: cursor.x - 13, top: cursor.y - 13, width: 26, height: 26 }}>
          <div className="w-full h-full rounded-full border-2 border-amber-400/70 bg-amber-400/20" />
        </div>
      )}
    </div>
  );
}

function fmtTime(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2, '0')}`; }
function bannerCls(k: 'wave' | 'good' | 'bad') {
  if (k === 'good') return 'bg-emerald-600/30 border border-emerald-400/50 text-emerald-200';
  if (k === 'bad') return 'bg-red-600/30 border border-red-400/50 text-red-200';
  return 'bg-black/55 border border-amber-400/40 text-amber-200';
}

function Pill({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`px-2.5 py-0.5 rounded-lg bg-black/55 border ${danger ? 'border-red-500/70' : 'border-white/15'} text-center`}>
      <span className="text-[9px] uppercase tracking-widest text-white/50 mr-1">{label}</span>
      <span className={`text-sm font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function DwellRing({ show, p }: { show: boolean; p: number }) {
  if (!show) return null;
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg className="absolute -inset-1 pointer-events-none" width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f59e0b" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 28 28)" />
    </svg>
  );
}

function HudBtn({ id, label, dwell, onClick }: { id: string; label: string; dwell: { id: string | null; p: number }; onClick: () => void }) {
  const active = dwell.id === id;
  return (
    <button data-hud-id={id}
      onClick={(e) => { if (e.isTrusted) return; onClick(); }}
      className={`relative w-72 py-3 rounded-xl text-lg font-semibold border transition-all ${active ? 'bg-amber-600/30 border-amber-400 scale-[1.03]' : 'bg-white/10 border-white/20'} text-white`}
      style={{ cursor: 'default' }}>
      {label}
      <div className="absolute bottom-0 left-0 h-1 rounded-full bg-amber-500" style={{ width: active ? `${dwell.p * 100}%` : 0 }} />
    </button>
  );
}
