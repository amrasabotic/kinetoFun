import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import { getAnimal } from '../../data/animals';
import type { CardDef } from '../../types';

interface Props {
  card: CardDef;
  disabled: boolean;
  onFlip: (cardId: string) => void;
}

export default function MemoryCard({ card, disabled, onFlip }: Props) {
  const [isFlipping, setIsFlipping] = useState(false);
  const animal = card.revealed || card.matched ? getAnimal(card.animalId) : null;

  function handleActivate() {
    if (!card.revealed && !card.matched && !disabled) {
      setIsFlipping(true);
      window.setTimeout(() => setIsFlipping(false), 300);
      onFlip(card.id);
    }
  }

  return (
    <HoverButton
      onActivate={handleActivate}
      disabled={disabled || card.revealed || card.matched}
      dwellMs={600}
      ringColor={card.matched ? '#2FA35A' : '#F4C430'}
      className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/15"
    >
      <div
        style={{
          transform: isFlipping ? 'scaleX(0)' : 'scaleX(1)',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {card.revealed || card.matched ? (
          <span className="text-3xl">{animal?.emoji}</span>
        ) : (
          <span className="text-2xl font-black text-white/50">?</span>
        )}
      </div>
    </HoverButton>
  );
}
