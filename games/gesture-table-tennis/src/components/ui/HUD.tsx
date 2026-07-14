import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '../../types';

interface Props {
  gs: GameState;
  onPause: () => void;
}

export default function HUD({ gs, onPause }: Props) {
  const isTimedMode = gs.mode === 'smash' || gs.mode === 'precision' || gs.mode === 'survival';
  const modeScore = gs.mode === 'smash' ? gs.smashScore : gs.mode === 'precision' ? gs.precisionScore : gs.survivalScore;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">

      {/* TOP BAR ─────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-5 pt-4">

        {/* Left: Player score + combo */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-purple-300 font-bold text-sm uppercase tracking-wider">YOU</span>
            <span className="text-white font-black text-4xl leading-none">{gs.score.player}</span>
          </div>
          {gs.combo >= 2 && (
            <motion.div key={gs.combo}
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1 rounded-full text-center font-black text-sm"
              style={{ background: 'rgba(168,85,247,0.35)', color: '#d8b4fe' }}>
              ×{gs.combo} COMBO
            </motion.div>
          )}
          <div className="px-3 py-1 rounded-full text-xs font-semibold text-center" style={{ background: 'rgba(0,0,0,0.4)', color: '#94a3b8' }}>
            Rally: {gs.rallyCount}
          </div>
        </div>

        {/* Center: Score divider or mode score */}
        <div className="flex flex-col items-center gap-1">
          {isTimedMode ? (
            <div className="px-6 py-2 rounded-2xl text-center" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-yellow-300 font-black text-3xl">{modeScore.toLocaleString()}</div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mt-0.5">Score</div>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-2xl text-center" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-gray-400 text-xs uppercase tracking-wider">vs</div>
            </div>
          )}
          {/* Timer for timed modes */}
          {isTimedMode && gs.mode !== 'survival' && (
            <div className={`px-4 py-1 rounded-xl font-black text-2xl ${gs.timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}
                 style={{ background: 'rgba(0,0,0,0.5)' }}>
              {Math.ceil(gs.timeLeft)}s
            </div>
          )}
          {gs.mode === 'survival' && (
            <div className="px-4 py-1 rounded-xl font-bold text-lg text-cyan-300" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {Math.floor(gs.survivalTime)}s
            </div>
          )}
        </div>

        {/* Right: AI score + mode info */}
        <div className="flex flex-col gap-1 items-end">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-red-300 font-black text-4xl leading-none">{gs.score.ai}</span>
            <span className="text-red-300 font-bold text-sm uppercase tracking-wider">AI</span>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.4)', color: '#94a3b8' }}>
            {gs.difficulty.toUpperCase()}
          </div>
          {/* Coins */}
          <div className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1" style={{ background: 'rgba(0,0,0,0.4)', color: '#fbbf24' }}>
            🪙 {gs.coins}
          </div>
        </div>
      </div>

      {/* POWER SHOT INDICATOR ─────────────────────────────────────── */}
      <div className="absolute left-4 bottom-20 flex flex-col gap-2">
        {/* Power charge bar */}
        <div className="flex flex-col gap-1">
          <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">Power</span>
          <div className="w-32 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div className="h-full rounded-full"
              style={{
                width: `${gs.powerShotCharge * 100}%`,
                background: gs.isChargingPower ? 'linear-gradient(90deg,#7c3aed,#a855f7,#fbbf24)' : '#4f46e5',
              }}
              animate={gs.isChargingPower ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
          </div>
          {gs.powerShotCooldown > 0 && (
            <span className="text-gray-500 text-xs">{gs.powerShotCooldown.toFixed(1)}s cooldown</span>
          )}
        </div>

        {/* Swing speed indicator */}
        <div className="flex flex-col gap-1">
          <span className="text-cyan-300 text-xs font-bold uppercase tracking-wider">Swing</span>
          <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${Math.min(100, gs.swingSpeed * 15)}%`,
                background: gs.swingSpeed > 3 ? '#ef4444' : gs.swingSpeed > 1.5 ? '#f97316' : '#22d3ee',
              }} />
          </div>
        </div>

        {/* Spin indicator */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-300 text-xs font-bold uppercase tracking-wider">Spin</span>
          <div className="text-xs font-bold" style={{ color: gs.currentSpin > 0 ? '#4ade80' : gs.currentSpin < 0 ? '#f87171' : '#9ca3af' }}>
            {gs.currentSpin > 0.2 ? '↑ TOP' : gs.currentSpin < -0.2 ? '↓ BACK' : '—'}
          </div>
        </div>
      </div>

      {/* ARCADE STAGE INFO ─────────────────────────────────────────── */}
      {gs.mode === 'arcade' && (
        <div className="absolute right-4 bottom-20 flex flex-col gap-1 items-end">
          <div className="px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div className="text-purple-300 text-xs uppercase tracking-wider">Stage</div>
            <div className="text-white font-black text-2xl">{gs.stageNumber}</div>
          </div>
          {gs.stageMods.map(mod => (
            <div key={mod} className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {modLabel(mod)}
            </div>
          ))}
        </div>
      )}

      {/* SMASH COUNT ────────────────────────────────────────────────── */}
      {gs.mode === 'smash' && (
        <div className="absolute right-4 bottom-20">
          <div className="px-4 py-2 rounded-2xl text-center" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="text-red-300 text-xs uppercase tracking-wider">Smashes</div>
            <div className="text-white font-black text-2xl">🔥 {gs.smashCount}</div>
          </div>
        </div>
      )}

      {/* PAUSE BUTTON ──────────────────────────────────────────────── */}
      <button
        onClick={onPause}
        className="absolute top-4 right-5 pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full font-bold text-white transition-all hover:scale-110"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', marginTop: 56 }}>
        ⏸
      </button>

      {/* SMASH SPEED INDICATOR ─────────────────────────────────────── */}
      <AnimatePresence>
        {gs.swingSpeed > 3 && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center"
            initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.2 }}>
            <div className="text-5xl font-black" style={{ color: '#ff4400', textShadow: '0 0 30px #ff4400' }}>
              {gs.swingSpeed > 4.5 ? '💥 SMASH!' : '⚡ POWER!'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function modLabel(mod: string): string {
  const labels: Record<string, string> = {
    fastBall: '⚡ Fast Ball', moreSpin: '🌀 More Spin', smallPaddle: '📏 Small Paddle',
    movingTable: '↔ Moving Table', wind: '💨 Wind', randomBounce: '🎲 Random Bounce',
  };
  return labels[mod] ?? mod;
}
