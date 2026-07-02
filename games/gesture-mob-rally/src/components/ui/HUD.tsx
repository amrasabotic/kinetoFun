import type { HudState } from '../../types';
import { POWERUP_DEFS } from '../../game/powerups/powerupDefs';

export default function HUD({ hud }: { hud: HudState }) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top-left: crowd + coins + level */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
        <Pill><span className="text-lg">👥</span><span className="font-extrabold text-lg">{hud.crowdCount}</span></Pill>
        <Pill><span className="text-lg">🪙</span><span className="font-bold">{hud.coins}</span></Pill>
        <Pill><span className="text-xs uppercase tracking-wide text-white/60">{hud.worldName} · Lv {hud.levelIndex + 1}</span></Pill>
      </div>

      {/* Top-right: score + combo + tracking status */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
        <Pill><span className="font-extrabold text-lg score-pop" key={hud.score}>{hud.score}</span></Pill>
        {hud.combo > 0 && (
          <Pill className="combo-shake"><span className="text-amber-300 font-bold">Combo x{hud.comboMultiplier}</span></Pill>
        )}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${hud.handDetected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${hud.handDetected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {hud.handDetected ? 'Tracking' : 'No Hand'}
        </div>
      </div>

      {/* Center-top: segment label / boss / castle / enemy HP */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-72">
        {hud.enemyCrowdCount !== null && (
          <Pill><span className="text-red-300 font-bold">Enemy Crowd: {hud.enemyCrowdCount}</span></Pill>
        )}
        {hud.bossHpPct !== null && (
          <div className="w-full">
            <div className="text-center text-xs font-bold text-amber-300 mb-1">{hud.bossName}</div>
            <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-white/20">
              <div className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-[width]" style={{ width: `${hud.bossHpPct * 100}%` }} />
            </div>
          </div>
        )}
        {hud.castleHpPct !== null && (
          <div className="w-full">
            <div className="text-center text-xs font-bold text-orange-300 mb-1">Castle</div>
            <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-white/20">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-[width]" style={{ width: `${hud.castleHpPct * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom-left: active power-ups */}
      {hud.activePowerUps.length > 0 && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {hud.activePowerUps.map((ap) => {
            const def = POWERUP_DEFS[ap.kind];
            const pct = ap.remainingMs / ap.totalMs;
            return (
              <div key={ap.kind} className="relative w-11 h-11 rounded-full flex items-center justify-center text-xl" style={{ background: `${def?.color ?? '#fff'}33`, border: `2px solid ${def?.color ?? '#fff'}` }}>
                {powerUpEmoji(ap.kind)}
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="20" fill="none" stroke={def?.color ?? '#fff'} strokeWidth="3" strokeDasharray={`${pct * 125.6} 125.6`} />
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom-right: charge meter */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${hud.chargeActive ? 'border-amber-300 bg-amber-400/30 float' : hud.chargeReady ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/20 bg-black/30'}`}>
          ✊
        </div>
        <span className="text-[10px] uppercase font-bold text-white/60">
          {hud.chargeActive ? 'Charging!' : hud.chargeReady ? 'Ready' : `${Math.ceil(hud.chargeCooldownMs / 1000)}s`}
        </span>
      </div>
    </div>
  );
}

function powerUpEmoji(kind: string): string {
  switch (kind) {
    case 'shield': return '🛡️';
    case 'speed': return '⚡';
    case 'magnet': return '🧲';
    case 'freeze': return '❄️';
    case 'doubleCoins': return '💰';
    case 'invincibility': return '⭐';
    default: return '✨';
  }
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white ${className}`}>
      {children}
    </div>
  );
}
