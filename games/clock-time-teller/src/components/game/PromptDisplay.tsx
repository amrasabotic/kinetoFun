import { AnimatePresence, motion } from 'framer-motion';
import ClockFace from '../common/ClockFace';
import { formatDigital } from '../../data/times';
import type { RoundPrompt } from '../../types';

export default function PromptDisplay({ prompt }: { prompt: RoundPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.time.hour}-${prompt.time.minute}-${prompt.presentation}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob"
        >
          {prompt.presentation === 'clock' ? (
            <ClockFace time={prompt.time} size={180} className="drop-shadow-2xl" />
          ) : (
            <div className="text-7xl font-black text-white drop-shadow-2xl">
              {formatDigital(prompt.time)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
