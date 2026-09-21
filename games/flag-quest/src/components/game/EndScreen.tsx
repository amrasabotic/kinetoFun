import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import FlagPreview from './FlagPreview';
import type { FlagDef, LevelResult } from '../../types';
import { ParticleSystem } from '../../particles/particleSystem';
import { playFanfare, playStar, playUnlock } from '../../audio/sound';

const MEDAL_LABEL: Record<LevelResult['medal'], string> = {
  none: '', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', perfect: 'Perfect!',
};

export default function EndScreen({
  flag, result, newAchievements, onNext, onReplay, onMainMenu, hasNext,
}: {
  flag: FlagDef;
  result: LevelResult;
  newAchievements: string[];
  onNext: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
  hasNext: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    playFanfare();
    const t1 = window.setTimeout(() => { for (let i = 0; i < result.stars; i++) window.setTimeout(playStar, i * 180); }, 300);
    const t2 = newAchievements.length > 0 ? window.setTimeout(playUnlock, 900) : null;

    const canvas = canvasRef.current;
    const system = new ParticleSystem();
    if (canvas) system.spawnConfetti(canvas.width / 2, 0, 70);
    let raf = 0; let last = performance.now();
    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = canvasRef.current;
      const ctx = c?.getContext('2d');
      if (c && ctx) {
        if (c.width !== window.innerWidth) { c.width = window.innerWidth; c.height = window.innerHeight; }
        ctx.clearRect(0, 0, c.width, c.height);
        system.update(dt);
        system.draw(ctx);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t1); if (t2) window.clearTimeout(t2); };
  }, [flag.id, result.stars, newAchievements.length]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a1140] via-[#160b30] to-[#0b0620] flex items-center justify-center text-white overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative z-20 bg-white/5 border border-white/15 rounded-3xl p-8 w-[520px] max-w-[90vw]"
      >
        <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden border-2 border-white/15 mb-4">
          <FlagPreview flag={flag} />
        </div>

        <h1 className="text-2xl font-extrabold text-center mb-1">{flag.country}</h1>
        <p className="text-center text-white/50 text-sm mb-3">
          {result.medal !== 'none' ? `${MEDAL_LABEL[result.medal]} medal` : 'Complete'}
        </p>

        <div className="flex justify-center gap-1 text-3xl mb-4">
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

        <div className="grid grid-cols-4 gap-3 text-center mb-4 text-sm">
          <div><p className="text-white/40 text-[10px] uppercase">Score</p><p className="font-bold">{result.score}</p></div>
          <div><p className="text-white/40 text-[10px] uppercase">Accuracy</p><p className="font-bold">{Math.round(result.accuracy * 100)}%</p></div>
          <div><p className="text-white/40 text-[10px] uppercase">Time</p><p className="font-bold">{Math.round(result.timeSec)}s</p></div>
          <div><p className="text-white/40 text-[10px] uppercase">Best Combo</p><p className="font-bold">x{result.bestCombo}</p></div>
        </div>

        <p className="text-center text-violet-200 text-sm italic mb-6">"{flag.facts.funFact}"</p>

        {newAchievements.length > 0 && (
          <p className="text-center text-yellow-300 text-xs mb-4">🏆 Achievement unlocked: {newAchievements.join(', ')}</p>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          {hasNext && (
            <HoverButton onActivate={onNext} ringColor="#2FA35A" className="px-6 py-3 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-sm font-bold">
              Next Flag →
            </HoverButton>
          )}
          <HoverButton onActivate={onReplay} ringColor="#F4C430" className="px-6 py-3 rounded-full bg-white/10 border border-white/15 text-sm font-bold">
            ⟳ Replay
          </HoverButton>
          <HoverButton onActivate={onMainMenu} ringColor="#8C5CFF" className="px-6 py-3 rounded-full bg-white/10 border border-white/15 text-sm font-bold">
            Main Menu
          </HoverButton>
        </div>
      </motion.div>
    </div>
  );
}
