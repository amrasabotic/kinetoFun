import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { BoardSize, CardDef, SessionResult } from '../../types';
import { buildDeck, getAnimal } from '../../data/animals';
import { pairCountForSize, gridDimsForSize } from '../../game/boardLogic';
import { finalizeSession } from '../../game/scoring';
import MemoryCard from './MemoryCard';
import HoverButton from '../common/HoverButton';
import { useSettingsStore } from '../../stores/settingsStore';
import { playCorrect, playTryAgain, speak } from '../../audio/sound';

interface Props {
  size: BoardSize;
  onExit: () => void;
  onSessionComplete: (result: SessionResult) => void;
}

export default function GameplayScreen({ size, onExit, onSessionComplete }: Props) {
  const audioNarration = useSettingsStore((s) => s.audioNarration);
  const pairCount = pairCountForSize(size);
  const { cols } = gridDimsForSize(size);

  const [cards, setCards] = useState<CardDef[]>(() => buildDeck(pairCount));
  const [firstPick, setFirstPick] = useState<string | null>(null);
  const [secondPick, setSecondPick] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [flips, setFlips] = useState(0);
  const [mismatches, setMismatches] = useState(0);

  const flipsRef = useRef(flips);
  const mismatchesRef = useRef(mismatches);
  flipsRef.current = flips;
  mismatchesRef.current = mismatches;

  const matchedCount = cards.filter((c) => c.matched).length;
  const isComplete = matchedCount === pairCount * 2;
  useEffect(() => {
    if (isComplete) {
      const result = finalizeSession(size, pairCount, flipsRef.current, mismatchesRef.current);
      onSessionComplete(result);
    }
  }, [isComplete, size, pairCount, onSessionComplete]);

  function handleCardFlip(cardId: string) {
    if (locked) return;

    const card = cards.find((c) => c.id === cardId)!;
    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, revealed: true } : c,
    );
    setCards(newCards);
    setFlips((n) => n + 1);

    if (audioNarration) {
      const animal = getAnimal(card.animalId);
      if (animal) {
        window.setTimeout(() => speak(animal.name, true), 150);
      }
    }

    if (!firstPick) {
      setFirstPick(cardId);
    } else if (!secondPick) {
      setSecondPick(cardId);

      const firstCard = newCards.find((c) => c.id === firstPick)!;
      const secondCard = newCards.find((c) => c.id === cardId)!;

      setLocked(true);
      window.setTimeout(() => {
        if (firstCard.animalId === secondCard.animalId) {
          playCorrect();
          const matched = newCards.map((c) =>
            c.animalId === firstCard.animalId ? { ...c, matched: true } : c,
          );
          setCards(matched);
          setFirstPick(null);
          setSecondPick(null);
          setLocked(false);
        } else {
          playTryAgain();
          setMismatches((n) => n + 1);
          window.setTimeout(() => {
            const flipped = newCards.map((c) =>
              c.id === firstPick || c.id === cardId
                ? { ...c, revealed: false }
                : c,
            );
            setCards(flipped);
            setFirstPick(null);
            setSecondPick(null);
            setLocked(false);
          }, 900);
        }
      }, 300);
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#241454] via-[#301a68] to-[#160c38] flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wide">
            {size === 'small' ? 'Small Zoo' : size === 'medium' ? 'Medium Zoo' : 'Big Zoo'}
          </p>
          <p className="font-bold text-lg">Flips: {flips}</p>
        </div>
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/30 border border-white/15 text-xs font-semibold">
          Exit
        </HoverButton>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: '0.75rem',
            maxWidth: `${cols * 100}px`,
          }}
        >
          {cards.map((card) => (
            <MemoryCard
              key={card.id}
              card={card}
              disabled={locked}
              onFlip={handleCardFlip}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
