import { AnimatePresence, motion } from 'framer-motion';
import { getLetterEntry } from '../../data/letters';
import { getAnimalEntry } from '../../data/animals';
import { playAnimalCall } from '../../audio/sound';
import HoverButton from '../common/HoverButton';
import type { LetterGameMode, RoundPrompt } from '../../types';

export default function PromptDisplay({ mode, prompt }: { mode: LetterGameMode; prompt: RoundPrompt }) {
  const animal = mode === 'animal' ? getAnimalEntry(prompt.letter) : undefined;
  const entry = animal ?? getLetterEntry(prompt.letter);
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
          {showAnimal && animal && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-7xl drop-shadow-2xl">{animal.emoji}</div>
              <p className="text-3xl font-extrabold text-white/90">{animal.word}</p>
              <p className="text-2xl font-bold text-yellow-200">says &ldquo;{animal.says}!&rdquo;</p>
              <HoverButton onActivate={() => playAnimalCall(animal.word)} dwellMs={900} ringColor="#FFD54A"
                className="mt-1 px-6 py-3 rounded-full bg-white/15 border-2 border-white/30 text-xl font-bold">
                Hear it again
              </HoverButton>
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
