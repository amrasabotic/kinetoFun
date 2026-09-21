import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { playInstrumentSound } from '../../audio/instruments';
import type { RoundPrompt } from '../../types';

export default function PromptDisplay({ prompt }: { prompt: RoundPrompt }) {
  const [pulsing, setPulsing] = useState(false);

  function replay() {
    setPulsing(true);
    playInstrumentSound(prompt.instrumentId);
    window.setTimeout(() => setPulsing(false), 500);
  }

  useEffect(() => {
    replay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt.instrumentId]);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={pulsing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-6xl"
      >
        🔊
      </motion.div>
      <p className="text-2xl font-black text-white drop-shadow-2xl">Listen!</p>
      <HoverButton
        onActivate={replay}
        dwellMs={500}
        ringColor="#4A90D9"
        className="px-6 py-3 rounded-full bg-white/10 border-2 border-white/20 text-sm font-bold text-white"
      >
        ▶ Replay Sound
      </HoverButton>
    </div>
  );
}
