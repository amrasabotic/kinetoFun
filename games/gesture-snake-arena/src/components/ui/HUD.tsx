import type { GameHUDState } from '../../hooks/useGameEngine';
import type { GameSettings, ActivePowerUp } from '../../types';
import { POWERUP_COLORS, POWERUP_ICONS, POWERUP_NAMES } from '../../game/collectibles/PowerUp';
import { BOOST_COOLDOWN_MS } from '../../constants/gameConfig';

interface Props {
  hudState: GameHUDState;
  settings: GameSettings;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2,'0')}`;
}

export default function HUD({ hudState, settings }: Props) {
  const {
    score, length, combo, boostCooldown, boostActive,
    survivalMs, aiAlive, activePowerUps, quests,
    leaderboard, speed, handDetected,
  } = hudState;

  const boostPct = boostActive ? 100 : Math.max(0, Math.min(100, (1 - boostCooldown / BOOST_COOLDOWN_MS) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none select-none">

      {/* ── Top Left: Score / Length / Time ─────────────────────────────── */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <Panel>
          <div className="text-xs text-white/60 font-display uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-white font-display">{score.toLocaleString()}</div>
        </Panel>
        <Panel>
          <div className="text-xs text-white/60 font-display uppercase tracking-wider">Length</div>
          <div className="text-xl font-bold text-emerald-300 font-display">{Math.floor(length)}</div>
        </Panel>
        <Panel>
          <div className="text-xs text-white/60 font-display uppercase tracking-wider">Time</div>
          <div className="text-xl font-bold text-sky-300 font-display">{fmt(survivalMs)}</div>
        </Panel>
      </div>

      {/* ── Top Right: Leaderboard ───────────────────────────────────────── */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 min-w-[160px]">
        <Panel>
          <div className="text-xs text-white/60 font-display uppercase tracking-wider mb-1">Rankings</div>
          {leaderboard.slice(0, 6).map(e => (
            <div key={e.name + e.rank}
              className={`flex justify-between text-xs gap-2 font-sans ${e.isPlayer ? 'text-yellow-300 font-bold' : 'text-white/80'}`}>
              <span>#{e.rank} {e.name}</span>
              <span>{e.score.toLocaleString()}</span>
            </div>
          ))}
          <div className="text-xs text-white/50 mt-1 font-sans">AI alive: {aiAlive}</div>
        </Panel>
      </div>

      {/* ── Combo ───────────────────────────────────────────────────────── */}
      {combo > 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="text-center font-display font-black text-4xl animate-bounce"
            style={{ color: '#FFD740', textShadow: '0 0 20px #FFD740, 0 0 40px #FF6B00' }}>
            ×{combo} COMBO!
          </div>
        </div>
      )}

      {/* ── Bottom Left: Gesture + Boost ─────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <Panel>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${handDetected ? 'bg-green-400' : 'bg-red-400'} shadow-lg`} />
            <div className="text-xs font-sans text-white/80">
              {handDetected ? 'Hand detected' : 'Show your hand'}
            </div>
          </div>
          <div className="text-xs text-white/60 font-sans mt-1">
            Speed: {speed.toFixed(1)}
          </div>
        </Panel>
        {/* Boost bar */}
        <Panel>
          <div className="text-xs text-white/60 font-display uppercase tracking-wider mb-1">Boost</div>
          <div className="w-32 h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${boostActive ? 'bg-orange-400' : boostPct >= 100 ? 'bg-green-400' : 'bg-sky-400'}`}
              style={{ width: `${boostPct}%` }}
            />
          </div>
          <div className="text-xs text-white/50 mt-1 font-sans">
            {boostActive ? '⚡ BOOSTING' : boostPct >= 100 ? 'Ready! Make a fist' : 'Recharging...'}
          </div>
        </Panel>
      </div>

      {/* ── Bottom Right: Active power-ups ───────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        {activePowerUps.map(pu => (
          <PowerUpPill key={pu.type} pu={pu} />
        ))}
      </div>

      {/* ── Quests (right side, below leaderboard) ───────────────────────── */}
      <div className="absolute right-4 flex flex-col gap-1" style={{ top: '40%' }}>
        {quests.map(q => (
          <div key={q.id} className={`px-3 py-2 rounded-xl text-xs font-sans backdrop-blur-sm
            ${q.completed ? 'bg-green-500/40 text-green-200' : 'bg-black/40 text-white/80'}`}
            style={{ minWidth: 160, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="font-bold">{q.completed ? '✓ ' : ''}{q.description}</div>
            <div className="text-white/50">
              {Math.min(q.current, q.target)}/{q.target} • {q.reward}🪙
            </div>
            <div className="w-full h-1 bg-white/20 rounded mt-1">
              <div className="h-full bg-yellow-400 rounded"
                style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-xl backdrop-blur-sm font-sans"
      style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {children}
    </div>
  );
}

function PowerUpPill({ pu }: { pu: ActivePowerUp }) {
  const pct = (pu.remaining / pu.total) * 100;
  const color = POWERUP_COLORS[pu.type];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${color}55`, minWidth: 130 }}>
      <span className="text-base">{POWERUP_ICONS[pu.type]}</span>
      <div className="flex-1">
        <div className="text-xs font-sans font-bold" style={{ color }}>
          {POWERUP_NAMES[pu.type]}
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded mt-0.5">
          <div className="h-full rounded transition-all"
            style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
