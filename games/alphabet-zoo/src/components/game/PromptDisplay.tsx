import { AnimatePresence, motion } from 'framer-motion';
import { getLetterEntry } from '../../data/letters';
import type { LetterGameMode, RoundPrompt } from '../../types';

export default function PromptDisplay({ mode, prompt }: { mode: LetterGameMode; prompt: RoundPrompt }) {
  const entry = getLetterEntry(prompt.letter);
  if (!entry) return null;

  const showLetter = mode === 'letter';
  const showAnimal = mode === 'animal';

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.letter}-${mode}`}
          initial={{ scale: 0.5, opacity: 0, rotateY: -20 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob"
        >
          {showLetter && (
            <div className="text-8xl font-black text-white drop-shadow-2xl leading-none">
              {prompt.letter}
            </div>
          )}
          {showAnimal && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-7xl drop-shadow-2xl">{entry.emoji}</div>
              <p className="text-3xl font-extrabold text-white/90">{entry.word}</p>
            </div>
          )}
          {mode === 'mixed' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl drop-shadow-2xl">{entry.emoji}</div>
              <p className="text-2xl font-extrabold text-white/80">{entry.word}</p>
              <div className="text-5xl font-black text-white/60 drop-shadow-lg">{prompt.letter}</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
