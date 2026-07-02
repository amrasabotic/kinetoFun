import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import WeatherIcon from '../common/WeatherIcon';
import ClothingIcon from '../common/ClothingIcon';
import { scenarioById } from '../../data/weather';
import type { BinDef } from '../../types';

interface Props {
  bin: BinDef;
  presentation: 'weather' | 'clothing';
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function WeatherBin({ bin, presentation, disabled, onCorrect, onWrong }: Props) {
  const [shaking, setShaking] = useState(false);
  const scenario = scenarioById(bin.scenarioId);

  function handleActivate() {
    if (bin.isCorrect) {
      onCorrect();
    } else {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
      onWrong();
    }
  }

  if (!scenario) return null;

  return (
    <HoverButton
      onActivate={handleActivate}
      disabled={disabled}
      dwellMs={600}
      ringColor="#4A90D9"
      className={`flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      {presentation === 'weather' ? (
        <WeatherIcon weather={scenario.weather} size={80} />
      ) : (
        <ClothingIcon clothing={scenario.clothing} size={80} />
      )}
    </HoverButton>
  );
}
