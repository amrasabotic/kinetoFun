import { AnimatePresence, motion } from 'framer-motion';
import WeatherIcon from '../common/WeatherIcon';
import ClothingIcon from '../common/ClothingIcon';
import { scenarioById } from '../../data/weather';
import type { RoundPrompt } from '../../types';

export default function PromptDisplay({ prompt }: { prompt: RoundPrompt }) {
  const scenario = scenarioById(prompt.scenarioId);
  if (!scenario) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${prompt.scenarioId}-${prompt.presentation}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="scs-bob flex flex-col items-center gap-2"
        >
          {prompt.presentation === 'weather' ? (
            <>
              <WeatherIcon weather={scenario.weather} size={140} className="drop-shadow-2xl" />
              <span className="text-2xl font-black text-white">{scenario.name}</span>
            </>
          ) : (
            <ClothingIcon clothing={scenario.clothing} size={140} className="drop-shadow-2xl" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
