import { AnimatePresence, motion } from 'framer-motion';
import ShapeIcon from '../common/ShapeIcon';
import { colorHex, colorLabel } from '../../data/colors';
import { shapeLabel } from '../../data/shapes';
import type { RoundPrompt, SortMode } from '../../types';

const NEUTRAL = '#CBD5E1';

export default function PromptDisplay({ mode, prompt }: { mode: SortMode; prompt: RoundPrompt }) {
  const color = mode === 'shape' ? NEUTRAL : colorHex(prompt.color);
  const shape = mode === 'color' ? 'circle' : prompt.shape;

  const caption =
    mode === 'shape' ? shapeLabel(prompt.shape)
    : mode === 'color' ? colorLabel(prompt.color)
    : `${colorLabel(prompt.color)} ${shapeLabel(prompt.shape)}`;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.shape}-${prompt.color}-${mode}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob"
        >
          <ShapeIcon shape={shape} color={color} className="w-40 h-40 drop-shadow-2xl" />
        </motion.div>
      </AnimatePresence>
      <p className="text-2xl font-extrabold text-white/90">{caption}</p>
    </div>
  );
}
