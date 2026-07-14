import type { HudSnapshot, Settings } from '../types/GameTypes';

interface Props {
  hud: HudSnapshot;
  settings: Settings;
  pauseHoldProgress: number;
}

function Heart({ filled, large }: { filled: boolean; large: boolean }) {
  const s = large ? 22 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? '#ff4d6d' : 'rgba(255,255,255,0.15)'}>
      <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.3 5 6 5c2 0 3.5 1 4.5 2.3C11.5 6 13 5 15 5c3.7 0 5.5 3.4 4 6.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export default function HUD({ hud, settings, pauseHoldProgress }: Props) {
  const textScale = settings.largeUI ? 1.4 : 1;
  const powerFrac = hud.powerDuration > 0 ? hud.powerRemainingMs / hud.powerDuration : 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontSize: `${textScale}rem` }}>
      {/* Top-left: score / high score / level */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="bg-black/55 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/10">
          <div className="text-[0.7em] uppercase tracking-widest text-white/50">Score</div>
          <div className="text-2xl font-black text-white tabular-nums leading-none" style={{ textShadow: '0 0 12px rgba(57,255,136,0.6)' }}>
            {hud.score.toLocaleString()}
          </div>
        </div>
        <div className="bg-black/40 rounded-lg px-3 py-1 text-[0.75em] text-white/60 flex gap-3">
          <span>
            High <b className="text-white/90">{hud.highScore.toLocaleString()}</b>
          </span>
          <span>
            Level <b className="text-white/90">{hud.level}</b>
          </span>
        </div>
      </div>

      {/* Top-center: combo */}
      {hud.comboMultiplier > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-500/80 to-cyan-400/80 rounded-full px-4 py-1.5 font-black text-white text-lg shadow-lg animate-pulse-glow">
          COMBO x{hud.comboMultiplier}
        </div>
      )}

      {/* Top-right: lives */}
      <div className="absolute top-4 right-[192px] bg-black/55 rounded-xl px-3 py-2 backdrop-blur-sm border border-white/10 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <Heart key={i} filled={i < hud.lives} large={settings.largeUI} />
        ))}
      </div>

      {/* Bottom-left: orbs remaining */}
      <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg px-3 py-1.5 text-white/70 text-sm">
        Orbs {hud.orbsTotal - hud.orbsRemaining}/{hud.orbsTotal}
      </div>

      {/* Bottom-right: fps + tracking */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
        {settings.showFps && <div className="bg-black/50 rounded px-2 py-0.5 text-[0.65em] text-white/50 font-mono">{hud.fps} FPS</div>}
        <div className="bg-black/50 rounded px-2 py-0.5 text-[0.65em] flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${hud.handDetected ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-white/60">{hud.handDetected ? 'Hand tracked' : 'Show your hand'}</span>
        </div>
      </div>

      {/* Power mode countdown ring — bottom center */}
      {hud.powerActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <svg width="54" height="54" className="-rotate-90">
            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
            <circle
              cx="27"
              cy="27"
              r="22"
              fill="none"
              stroke="#ffd23f"
              strokeWidth="5"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - powerFrac)}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[0.7em] font-bold text-amber-300 -mt-9">{Math.ceil(hud.powerRemainingMs / 1000)}</span>
          <span className="text-[0.65em] text-amber-200/80 uppercase tracking-wider mt-6">Power Mode</span>
        </div>
      )}

      {/* Hold-open-palm-to-pause hint ring */}
      {pauseHoldProgress > 0.02 && (
        <div className="absolute top-24 right-8 flex flex-col items-center gap-1">
          <svg width="46" height="46" className="-rotate-90">
            <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
            <circle
              cx="23"
              cy="23"
              r="18"
              fill="none"
              stroke="#0af0ff"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - pauseHoldProgress)}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[0.6em] text-cyan-200 -mt-8">Pause</span>
        </div>
      )}

      {hud.paused && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 mt-16 bg-black/70 rounded-full px-3 py-1 text-[0.7em] text-white/70 uppercase tracking-widest">
          Paused
        </div>
      )}
    </div>
  );
}
