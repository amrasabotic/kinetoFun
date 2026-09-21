import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import InstrumentIcon from '../common/InstrumentIcon';
import { instrumentById } from '../../data/instruments';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function InstrumentBin({ bin, disabled, onCorrect, onWrong }: Props) {
  const [shaking, setShaking] = useState(false);
  const instrument = instrumentById(bin.instrumentId);

  function handleActivate() {
    if (bin.isCorrect) {
      onCorrect();
    } else {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
      onWrong();
    }
  }

  if (!instrument) return null;

  return (
    <HoverButton
      onActivate={handleActivate}
      disabled={disabled}
      dwellMs={600}
      ringColor="#9B4FD6"
      className={`flex flex-col items-center justify-center gap-1 w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      <InstrumentIcon instrument={instrument.id} size={64} />
      <span className="text-sm font-bold text-white">{instrument.name}</span>
    </HoverButton>
  );
}
