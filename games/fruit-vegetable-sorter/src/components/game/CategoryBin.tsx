import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function CategoryBin({ bin, disabled, onCorrect, onWrong }: Props) {
  const [shaking, setShaking] = useState(false);
  const categoryLabel = bin.category === 'fruit' ? 'Fruit' : 'Vegetable';
  const categoryEmoji = bin.category === 'fruit' ? '🍎' : '🥕';
  const ringColor = bin.category === 'fruit' ? '#E4362E' : '#2FA35A';

  function handleActivate() {
    if (bin.isCorrect) {
      onCorrect();
    } else {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
      onWrong();
    }
  }

  return (
    <HoverButton
      onActivate={handleActivate}
      disabled={disabled}
      dwellMs={600}
      ringColor={ringColor}
      className={`flex flex-col items-center justify-center gap-3 w-40 h-40 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      <span className="text-5xl">{categoryEmoji}</span>
      <span className="text-2xl font-bold text-white">{categoryLabel}</span>
    </HoverButton>
  );
}
