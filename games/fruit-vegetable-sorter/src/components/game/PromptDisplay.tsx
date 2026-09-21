import { useEffect } from 'react';
import { motion } from 'framer-motion';
import ProduceIcon from '../common/ProduceIcon';
import { produceById } from '../../data/produce';
import { speak } from '../../audio/sound';
import { useSettingsStore } from '../../stores/settingsStore';
import type { RoundPrompt } from '../../types';

interface Props {
  prompt: RoundPrompt;
}

export default function PromptDisplay({ prompt }: Props) {
  const audioNarration = useSettingsStore((s) => s.audioNarration);
  const produce = produceById(prompt.produceId);

  useEffect(() => {
    if (audioNarration && produce) {
      const text = `Is ${produce.name} a fruit or a vegetable?`;
      window.setTimeout(() => speak(text, true), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt.produceId]);

  if (!produce) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <ProduceIcon produce={produce.id} size={96} />
      </motion.div>
      <div className="text-center">
        <p className="text-sm text-white/60 uppercase tracking-wider">What is this?</p>
        <p className="text-3xl font-extrabold text-white mt-1">{produce.name}</p>
      </div>
    </div>
  );
}
