import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import CoinGroup from '../common/CoinGroup';
import { formatAmount } from '../../data/coins';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  presentation: 'coins' | 'digital';
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function MoneyBin({ bin, presentation, disabled, onCorrect, onWrong }: Props) {
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
      ringColor="#FFD700"
      className={`flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      {presentation === 'coins' ? (
        <CoinGroup amount={bin.amount} size="compact" />
      ) : (
        <span className="text-2xl font-black text-white">{formatAmount(bin.amount)}</span>
      )}
    </HoverButton>
  );
}
