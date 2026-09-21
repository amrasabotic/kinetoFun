import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { icon: '🤚', title: 'Move Your Paddle', desc: 'Move your hand left and right to position the paddle on the table. Raise or lower your hand to change paddle height.' },
  { icon: '🌀', title: 'Apply Spin', desc: 'Rotate your wrist to tilt the paddle. This applies topspin (forward arc) or backspin (floating), and sidespin for curved shots.' },
  { icon: '⚡', title: 'Swing Speed = Power', desc: 'A fast swing sends a power shot. A very fast swing triggers a SMASH! Slow swings give you precision control.' },
  { icon: '✊', title: 'Power Shot', desc: 'Close your fist and hold for 1 second to charge a Power Shot. Release to unleash! 5-second cooldown after use.' },
  { icon: '🏓', title: 'Return the Ball', desc: 'The ball must bounce once on the opponent\'s side after you hit it. Return the ball before it bounces twice on your side.' },
  { icon: '🎯', title: 'Score Points', desc: 'Win a rally to score. First to 11 points (win by 2) wins the match. Combos and tricks earn bonus coins!' },
];

interface Props { onBack: () => void; }

export default function HowToPlay({ onBack }: Props) {
  const [current, setCurrent] = useState(0);
  const step = STEPS[current];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a003a 0%, #0a0014 70%)' }}>

      <div className="flex items-center gap-4 absolute top-6 left-6">
        <button onClick={onBack} className="text-purple-300 hover:text-white transition-colors text-2xl">←</button>
        <h2 className="text-2xl font-black text-white">How To Play</h2>
      </div>

      <div className="flex flex-col items-center max-w-lg w-full px-6 gap-8">

        {/* Progress dots */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === current ? 'bg-purple-400 scale-125' : i < current ? 'bg-purple-600' : 'bg-gray-700'}`} />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6 text-center">

            <motion.div className="text-8xl"
              animate={{ y: [-6, 6, -6], rotate: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              {step.icon}
            </motion.div>

            <h3 className="text-4xl font-black text-white">{step.title}</h3>
            <p className="text-purple-200 text-lg leading-relaxed">{step.desc}</p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-4">
          <button onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="px-6 py-3 rounded-2xl font-bold text-gray-300 transition-all disabled:opacity-30 hover:bg-white/10">
            ← Prev
          </button>
          {current < STEPS.length - 1 ? (
            <button onClick={() => setCurrent(current + 1)}
              className="px-8 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              Next →
            </button>
          ) : (
            <button onClick={onBack}
              className="px-8 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)' }}>
              ✓ Got It!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
