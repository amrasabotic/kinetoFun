import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import ClockFace from '../common/ClockFace';
import { formatDigital } from '../../data/times';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  /** The bin shows the opposite of whatever the prompt is showing this round. */
  presentation: 'clock' | 'digital';
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function TimeBin({ bin, presentation, disabled, onCorrect, onWrong }: Props) {
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
      className={`flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      {presentation === 'clock' ? (
        <ClockFace time={bin.time} size={96} />
      ) : (
        <span className="text-2xl font-black text-white">{formatDigital(bin.time)}</span>
      )}
    </HoverButton>
  );
}
