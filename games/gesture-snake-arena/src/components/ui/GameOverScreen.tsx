import { motion } from 'framer-motion';
import { playClick } from '../../game/audio/audioSystem';

interface Props {
  score: number;
  length: number;
  survivalMs: number;
  highScore: number;
  onRestart: () => void;
  onMenu: () => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function GameOverScreen({ score, length, survivalMs, highScore, onRestart, onMenu }: Props) {
  const isNewBest = score >= highScore;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex flex-col items-center gap-6 px-10 py-10 rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #1a1a3e, #0d0d2e)', border: '2px solid rgba(255,255,255,0.15)', maxWidth: 440, width: '90%' }}
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {/* Title */}
        <div className="text-center">
          <div className="text-5xl mb-2">💥</div>
          <h2 className="text-3xl font-black font-display text-white">Game Over!</h2>
          {isNewBest && (
            <motion.div
              className="text-yellow-300 font-bold font-display text-lg mt-1"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              🏆 NEW HIGH SCORE!
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <StatCard label="Score" value={score.toLocaleString()} color="#FFD740" />
          <StatCard label="Best" value={Math.max(score, highScore).toLocaleString()} color="#FF8C00" />
          <StatCard label="Length" value={String(Math.floor(length))} color="#69F0AE" />
          <StatCard label="Survived" value={fmt(survivalMs)} color="#4FC3F7" />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            className="w-full py-4 rounded-2xl font-display font-bold text-xl text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 24px rgba(124,58,237,0.4)' }}
            onClick={() => { playClick(); onRestart(); }}
          >
            ▶ Play Again
          </button>
          <button
            className="w-full py-3 rounded-2xl font-display font-bold text-lg text-white/70 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
            onClick={() => { playClick(); onMenu(); }}
          >
            ← Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="text-xs text-white/50 font-sans uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold font-display" style={{ color }}>{value}</div>
    </div>
  );
}
