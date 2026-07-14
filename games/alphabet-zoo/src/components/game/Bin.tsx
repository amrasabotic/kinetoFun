import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function LetterBin({ bin, disabled, onCorrect, onWrong }: Props) {
  const [shaking, setShaking] = useState(false);

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
      ringColor="#F4C430"
      className={`flex items-center justify-center w-28 h-28 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      <span className="text-5xl font-black text-white">{bin.letter}</span>
    </HoverButton>
  );
}
