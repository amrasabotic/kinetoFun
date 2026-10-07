import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '☝️', title: 'Point with one finger', desc: 'Raise your hand to the camera. The dot on screen follows your index fingertip.' },
  { icon: '🤏', title: 'Pinch to grab', desc: 'Touch your thumb and index fingertip together to pick something up. Move it, then open your fingers to drop it.' },
  { icon: '🌱', title: 'Plant', desc: 'Pinch a seed from the tray and drop it on an empty plot. Seeds cost coins.' },
  { icon: '⏰', title: 'Let it grow', desc: 'Crops grow over time, even while you are away. Come back when they are ripe.' },
  { icon: '🧺', title: 'Harvest', desc: 'Pinch a ripe crop and drop it in the basket to earn coins.' },
  { icon: '💰', title: 'Grow your farm', desc: 'Hover "Buy" on a new plot or "Unlock" on a new seed to spend coins. There is no way to lose!' },
];

// The confirm button ignores the hand for a moment so a player whose finger is
// already resting where the button appears does not skip the screen unread.
const ARM_DELAY_MS = 1500;

export default function HowToPlayScreen({ onDone, doneLabel }: { onDone: () => void; doneLabel: string }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a5e1a] via-[#1e4a16] to-[#0f2410] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-200 via-white to-yellow-200">
          How to Play
        </h1>
        <p className="text-white/60 mt-2 text-lg">Grow your farm with your hand</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 max-w-3xl mb-10">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <div className="text-4xl flex-shrink-0">{s.icon}</div>
            <div>
              <div className="font-bold text-white text-lg">{s.title}</div>
              <div className="text-white/70 text-sm leading-relaxed mt-0.5">{s.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <HoverButton
        onActivate={onDone}
        disabled={!armed}
        dwellMs={900}
        ringColor="#2FA35A"
        className="px-10 py-4 rounded-2xl bg-green-500/20 border-2 border-green-400/60 text-2xl font-extrabold"
      >
        {doneLabel}
      </HoverButton>
      <p className="mt-3 text-sm text-white/50">Hold your fingertip on the button to continue</p>
    </div>
  );
}
