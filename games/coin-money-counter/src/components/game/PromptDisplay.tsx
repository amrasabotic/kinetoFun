import { AnimatePresence, motion } from 'framer-motion';
import CoinGroup from '../common/CoinGroup';
import { formatAmount } from '../../data/coins';
import type { RoundPrompt } from '../../types';

export default function PromptDisplay({ prompt }: { prompt: RoundPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.amount}-${prompt.presentation}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob"
        >
          {prompt.presentation === 'coins' ? (
            <CoinGroup amount={prompt.amount} size="normal" />
          ) : (
            <div className="text-7xl font-black text-white drop-shadow-2xl">
              {formatAmount(prompt.amount)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
