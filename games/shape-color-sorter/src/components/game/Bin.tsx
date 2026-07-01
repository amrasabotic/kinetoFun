import { useState } from 'react';
import HoverButton from '../common/HoverButton';
import ShapeIcon from '../common/ShapeIcon';
import { colorHex, COLOR_LABEL_GLYPH } from '../../data/colors';
import type { BinDef, SortMode } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';

const NEUTRAL = '#CBD5E1';

interface Props {
  bin: BinDef;
  mode: SortMode;
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function Bin({ bin, mode, disabled, onCorrect, onWrong }: Props) {
  const [shaking, setShaking] = useState(false);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);

  const shape = mode === 'color' ? 'circle' : bin.shape!;
  const color = mode === 'shape' ? NEUTRAL : colorHex(bin.color!);

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
      ringColor={mode === 'shape' ? NEUTRAL : color}
      className={`relative flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/15 ${shaking ? 'scs-wobble' : ''}`}
    >
      <ShapeIcon shape={shape} color={color} className="w-20 h-20" />
      {colorblindMode && mode !== 'shape' && bin.color && (
        <span className="absolute bottom-2 text-[10px] font-black text-white/70">{COLOR_LABEL_GLYPH[bin.color]}</span>
      )}
    </HoverButton>
  );
}
