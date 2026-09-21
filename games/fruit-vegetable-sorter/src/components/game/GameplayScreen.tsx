import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BinDef, ProduceGameMode, RoundPrompt, SessionResult } from '../../types';
import { generateRound } from '../../game/roundLogic';
import { finalizeSession, type RoundTally } from '../../game/scoring';
import PromptDisplay from './PromptDisplay';
import CategoryBin from './CategoryBin';
import HoverButton from '../common/HoverButton';
import { useSettingsStore } from '../../stores/settingsStore';
import { playCorrect, playTryAgain, speak } from '../../audio/sound';

const ROUNDS_PER_SESSION = 10;

interface Props {
  mode: ProduceGameMode;
  onExit: () => void;
  onSessionComplete: (result: SessionResult) => void;
}

export default function GameplayScreen({ mode, onExit, onSessionComplete }: Props) {
  const audioNarration = useSettingsStore((s) => s.audioNarration);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<{ prompt: RoundPrompt; bins: BinDef[] } | null>(null);
  const [wrongThisRound, setWrongThisRound] = useState(false);
  const [locked, setLocked] = useState(false);
  const [flyBinId, setFlyBinId] = useState<string | null>(null);
  const tallyRef = useRef<RoundTally[]>([]);
  const roundStartRef = useRef(performance.now());
  const prevProduceRef = useRef<string | null>(null);

  useEffect(() => {
    const next = generateRound(mode, roundIndex, prevProduceRef.current);
    prevProduceRef.current = next.prompt.produceId;
    setRound(next);
    setWrongThisRound(false);
    setLocked(false);
    setFlyBinId(null);
    roundStartRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, mode]);

  function handleCorrect(binId: string) {
    if (locked) return;
    setLocked(true);
    setFlyBinId(binId);
    playCorrect();
    const timeSec = (performance.now() - roundStartRef.current) / 1000;
    tallyRef.current.push({ correct: !wrongThisRound, timeSec });

    if (audioNarration && round) {
      const categoryName = round.bins.find((b) => b.id === binId)?.category === 'fruit' ? 'fruit' : 'vegetable';
      window.setTimeout(() => speak(`That's correct! It's a ${categoryName}.`, true), 200);
    }

    window.setTimeout(() => {
      if (roundIndex + 1 >= ROUNDS_PER_SESSION) {
        const result = finalizeSession(mode, tallyRef.current);
        onSessionComplete(result);
      } else {
        setRoundIndex((i) => i + 1);
      }
    }, 700);
  }

  function handleWrong() {
    if (locked) return;
    setWrongThisRound(true);
    playTryAgain();
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#241454] via-[#301a68] to-[#160c38] flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wide">
            {mode === 'fruit' ? 'Learning Fruits' : mode === 'vegetable' ? 'Learning Vegetables' : 'Mixed Mode'}
          </p>
          <p className="font-bold text-lg">Round {roundIndex + 1} / {ROUNDS_PER_SESSION}</p>
        </div>
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/30 border border-white/15 text-xs font-semibold">
          Exit
        </HoverButton>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        {round && <PromptDisplay prompt={round.prompt} />}

        <AnimatePresence>
          {wrongThisRound && (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-yellow-200 text-sm"
            >
              Try again — you can do it!
            </motion.p>
          )}
        </AnimatePresence>

        {round && (
          <div className="flex items-center justify-center gap-8">
            {round.bins.map((bin) => (
              <motion.div
                key={bin.id}
                animate={flyBinId === bin.id ? { scale: [1, 1.25, 0.2], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <CategoryBin
                  bin={bin}
                  disabled={locked}
                  onCorrect={() => handleCorrect(bin.id)}
                  onWrong={handleWrong}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
