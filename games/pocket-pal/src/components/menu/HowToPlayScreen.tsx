import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '☝️', title: 'Point with one finger', desc: 'Raise your hand to the camera. The dot on screen follows your index fingertip.' },
  { icon: '🤏', title: 'Pinch to grab', desc: 'Touch your thumb and index fingertip together to pick something up. Move it, then open your fingers to drop it.' },
  { icon: '🍎', title: 'Feed', desc: 'Pinch food from the tray and drop it on your pal to fill their tummy.' },
  { icon: '🧸', title: 'Play', desc: 'Pinch a toy and drop it on your pal to make them happy.' },
  { icon: '🤚', title: 'Pet', desc: 'Hover your fingertip over your pal to give them a pat.' },
  { icon: '❤️', title: 'Earn hearts', desc: 'Feeding and playing earn hearts. Hover a locked item to unlock it with hearts. Your pal grows up the more you care for them!' },
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
    <div className="fixed inset-0 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-200 via-white to-sky-300">
          How to Play
        </h1>
        <p className="text-white/60 mt-2 text-lg">Look after your pal with your hand</p>
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
