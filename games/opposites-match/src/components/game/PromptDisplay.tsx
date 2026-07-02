import { AnimatePresence, motion } from 'framer-motion';
import OppositeIcon from '../common/OppositeIcon';
import type { RoundPrompt } from '../../types';

export default function PromptDisplay({ prompt }: { prompt: RoundPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.pairId}-${prompt.word}-${prompt.presentation}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob flex flex-col items-center gap-2"
        >
          {prompt.presentation === 'word' ? (
            <div className="text-7xl font-black text-white drop-shadow-2xl">{prompt.word}</div>
          ) : (
            <>
              <OppositeIcon glyph={prompt.glyph} size={140} className="drop-shadow-2xl" />
              <span className="text-2xl font-black text-white">{prompt.word}</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
