import { motion } from 'framer-motion';
import type { GameState, GameMode } from '../../types';

interface Props {
  gs: GameState;
  onPlayAgain: () => void;
  onMenu: () => void;
  coins: number;
}

export default function GameOver({ gs, onPlayAgain, onMenu, coins }: Props) {
  const won = gs.matchWon;
  const mode = gs.mode;

  const modeScore = mode === 'smash' ? gs.smashScore
    : mode === 'precision' ? gs.precisionScore
    : mode === 'survival' ? gs.survivalScore
    : gs.score.player * 10 + gs.maxCombo;

  const stats: { label: string; value: string | number }[] = [
    { label: 'Your Score', value: gs.score.player },
    { label: 'AI Score',   value: gs.score.ai },
    { label: 'Best Combo', value: `×${gs.maxCombo}` },
    { label: 'Longest Rally', value: gs.longestRally },
    { label: 'Smashes', value: gs.smashCount },
    { label: 'Coins Earned', value: `🪙 ${coins}` },
  ];

  if (mode === 'smash')     stats.splice(0, 2, { label: 'Smash Score', value: gs.smashScore });
  if (mode === 'precision') stats.splice(0, 2, { label: 'Precision Score', value: gs.precisionScore });
  if (mode === 'survival')  stats.splice(0, 2, { label: 'Survival Time', value: `${Math.floor(gs.survivalTime)}s` });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50"
         style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)' }}>

      {/* Result banner */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="text-center mb-8">
        <div className="text-9xl mb-4">{won ? '🏆' : '😤'}</div>
        <h1 className="text-6xl font-black"
            style={{
              background: won ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#f87171,#ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
          {won ? 'VICTORY!' : 'DEFEATED'}
        </h1>
        {!modeIsScore(mode) && (
          <p className="text-2xl mt-2 font-bold text-gray-300">
            {gs.score.player} – {gs.score.ai}
          </p>
        )}
        {modeIsScore(mode) && (
          <p className="text-3xl mt-2 font-black text-yellow-300">{modeScore.toLocaleString()} pts</p>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-3 mb-8 w-full max-w-md px-6">
        {stats.map(s => (
          <div key={s.label} className="text-center py-3 px-2 rounded-2xl"
               style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Coins earned */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mb-8 px-8 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <span className="text-3xl">🪙</span>
        <div>
          <div className="text-yellow-300 font-black text-2xl">+{coins}</div>
          <div className="text-yellow-500/70 text-xs">Coins Earned</div>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="flex gap-4">
        <button onClick={onMenu}
          className="px-8 py-4 rounded-2xl font-bold text-lg text-gray-200 transition-all hover:scale-105 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
          ← Menu
        </button>
        <button onClick={onPlayAgain}
          className="px-10 py-4 rounded-2xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 30px rgba(124,58,237,0.5)' }}>
          ▶ Play Again
        </button>
      </motion.div>
    </div>
  );
}

function modeIsScore(mode: GameMode) {
  return mode === 'smash' || mode === 'precision' || mode === 'survival';
}
