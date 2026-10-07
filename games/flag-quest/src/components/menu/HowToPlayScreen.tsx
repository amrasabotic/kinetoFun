import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🎨', title: 'Pick a color', desc: 'Hover your fingertip over a paint swatch and hold for a moment to select it.' },
  { icon: '✋', title: 'Fill the region', desc: 'Hold your fingertip inside the matching outlined flag region — it fills in gradually while you stay there.' },
  { icon: '❌', title: 'Wrong color?', desc: 'Painting the wrong region flashes red and costs a little score, but never ends the run — just pick the right color and try that region again.' },
  { icon: '🏁', title: 'Finish the flag', desc: 'Fill every region to complete the flag. Fewer mistakes and a faster time earn more stars and a bigger combo bonus.' },
];

// The button ignores the hand for a moment so a player whose finger is
// already resting where it appears does not skip the screen unread.
const ARM_DELAY_MS = 1500;

export default function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a1140] via-[#160b30] to-[#0b0620] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-white to-sky-300">
          How to Play
        </h1>
        <p className="text-white/50 mt-1">No mouse or keyboard — everything is your fingertip</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mb-10">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <div className="text-3xl flex-shrink-0">{s.icon}</div>
            <div>
              <div className="font-bold text-white text-sm">{s.title}</div>
              <div className="text-white/60 text-xs leading-relaxed mt-0.5">{s.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <HoverButton
        onActivate={onBack}
        disabled={!armed}
        dwellMs={900}
        ringColor="#2FA35A"
        className="px-10 py-4 rounded-2xl bg-green-500/20 border-2 border-green-400/60 text-2xl font-extrabold"
      >
        Let's Play!
      </HoverButton>
      <p className="mt-3 text-sm text-white/50">Hold your fingertip on the button to continue</p>
    </div>
  );
}
