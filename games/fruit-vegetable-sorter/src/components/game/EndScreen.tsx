import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import type { SessionResult } from '../../types';
import { playFanfare, playStar, playUnlock } from '../../audio/sound';

const ENCOURAGEMENT: Record<0 | 1 | 2 | 3, string> = {
  0: "Nice try! Keep learning about fruits and veggies!",
  1: "Good job sorting!",
  2: "Great job! You're a produce expert!",
  3: "Amazing! Perfect sorting!",
};

const CONFETTI_EMOJI = ['🍎', '🥕', '🥬', '🌽', '🍓', '🥦'];

export default function EndScreen({
  result, newAchievements, onPlayAgain, onMainMenu,
}: {
  result: SessionResult;
  newAchievements: string[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}) {
  const confetti = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
    })),
    [],
  );

  useEffect(() => {
    playFanfare();
    const t1 = window.setTimeout(() => { for (let i = 0; i < result.stars; i++) window.setTimeout(playStar, i * 180); }, 300);
    const t2 = newAchievements.length > 0 ? window.setTimeout(playUnlock, 900) : null;
    return () => { window.clearTimeout(t1); if (t2) window.clearTimeout(t2); };
  }, [result.stars, newAchievements.length]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#241454] via-[#301a68] to-[#160c38] flex items-center justify-center text-white overflow-hidden">
      {confetti.map((c) => (
        <motion.span
          key={c.id}
          className="absolute text-3xl pointer-events-none"
          style={{ left: `${c.left}%`, top: '-10%' }}
          initial={{ y: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '120vh', opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.6 + Math.random() * 1.2, delay: c.delay, ease: 'easeIn' }}
        >
          {c.emoji}
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative z-20 bg-white/5 border border-white/15 rounded-3xl p-8 w-[460px] max-w-[90vw] text-center"
      >
        <h1 className="text-2xl font-extrabold mb-1">{ENCOURAGEMENT[result.stars]}</h1>

        <div className="flex justify-center gap-1 text-4xl my-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35 + i * 0.18, type: 'spring' }}
            >
              {i < result.stars ? '⭐' : '☆'}
            </motion.span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center mb-6 text-sm">
          <div><p className="text-white/40 text-[10px] uppercase">Correct</p><p className="font-bold">{result.correctFirstTry}/{result.rounds}</p></div>
          <div><p className="text-white/40 text-[10px] uppercase">Score</p><p className="font-bold">{result.score}</p></div>
          <div><p className="text-white/40 text-[10px] uppercase">Avg Time</p><p className="font-bold">{result.avgTimeSec.toFixed(1)}s</p></div>
        </div>

        {newAchievements.length > 0 && (
          <p className="text-center text-yellow-300 text-xs mb-4">🏆 New: {newAchievements.join(', ')}</p>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <HoverButton onActivate={onPlayAgain} ringColor="#2FA35A" className="px-6 py-3 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-sm font-bold">
            ⟳ Play Again
          </HoverButton>
          <HoverButton onActivate={onMainMenu} ringColor="#8C5CFF" className="px-6 py-3 rounded-full bg-white/10 border border-white/15 text-sm font-bold">
            Main Menu
          </HoverButton>
        </div>
      </motion.div>
    </div>
  );
}
