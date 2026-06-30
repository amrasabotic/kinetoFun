/** Game-over screen — animated stats + restart / menu buttons. */
import { motion } from 'framer-motion';
import type { GameOverResult } from '../../types';
import { playUiClick } from '../../game/audio/audioSystem';

interface Props {
  result:   GameOverResult;
  onRestart: () => void;
  onMenu:    () => void;
}

export default function GameOver({ result, onRestart, onMenu }: Props) {
  const rows = [
    { label: 'Distance',   value: `${Math.floor(result.distance)}m`,  icon: '📏', highlight: result.isNewBestDist },
    { label: 'Score',      value: result.score.toLocaleString(),       icon: '⭐', highlight: result.isNewHighScore },
    { label: 'Coins',      value: result.coins.toLocaleString(),       icon: '🪙', highlight: false },
    { label: 'Flips',      value: result.flips.toString(),             icon: '🔄', highlight: false },
    { label: 'Air Time',   value: `${result.airTime.toFixed(1)}s`,     icon: '⏱️', highlight: false },
    { label: 'Fuel Pickups', value: result.fuelPickups.toString(),     icon: '⚡', highlight: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18 }}
        className="w-full max-w-sm mx-4 rounded-3xl p-6 flex flex-col gap-4"
        style={{ background: 'linear-gradient(160deg,#12151f,#1a1040)', border: '1.5px solid rgba(255,107,53,0.3)' }}
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}
            className="text-5xl mb-2"
          >
            💥
          </motion.div>
          <h2 className="text-3xl font-black text-white">Game Over</h2>
          {(result.isNewHighScore || result.isNewBestDist) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="mt-2 px-4 py-1 rounded-full text-sm font-bold inline-block"
              style={{ background: 'linear-gradient(90deg,#FF6B35,#FFD600)', color: '#000' }}
            >
              {result.isNewHighScore ? '🏆 NEW HIGH SCORE!' : '📏 NEW BEST DISTANCE!'}
            </motion.div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="rounded-xl py-2 px-3"
              style={{
                background: r.highlight
                  ? 'rgba(255,107,53,0.18)'
                  : 'rgba(255,255,255,0.06)',
                border: r.highlight ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{r.icon}</span>
                <div>
                  <div className="text-white font-bold text-sm">{r.value}</div>
                  <div className="text-white/45 text-[10px]">{r.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Best records */}
        <div className="glass rounded-xl px-4 py-2.5 flex justify-between text-sm">
          <div>
            <div className="text-white/50 text-xs">Best Distance</div>
            <div className="text-white font-bold">{Math.floor(result.bestDistance)}m</div>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-xs">High Score</div>
            <div className="text-white font-bold">{result.highScore.toLocaleString()}</div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { playUiClick(); onRestart(); }}
            className="flex-1 py-4 rounded-2xl text-white font-black text-lg"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8F00)', boxShadow: '0 4px 20px rgba(255,107,53,0.45)' }}
          >
            ▶ Restart
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { playUiClick(); onMenu(); }}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-lg glass"
          >
            🏠 Menu
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
