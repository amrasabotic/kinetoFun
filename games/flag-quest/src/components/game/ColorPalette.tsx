import HoverButton from '../common/HoverButton';
import { PALETTE, COLOR_PATTERNS } from '../../flags/palette';
import type { ColorId } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { playSplash } from '../../audio/sound';

export default function ColorPalette({ selected, onSelect }: { selected: ColorId | null; onSelect: (c: ColorId) => void }) {
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);

  return (
    <div className="flex items-end justify-center gap-3 px-4 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
      {PALETTE.map((c) => {
        const isSelected = selected === c.id;
        return (
          <HoverButton
            key={c.id}
            dwellMs={500}
            onActivate={() => { onSelect(c.id); playSplash(); }}
            ringColor={c.hex}
            className={`flex flex-col items-center justify-center rounded-full border-4 transition-all ${
              isSelected ? 'w-16 h-16 -translate-y-2' : 'w-12 h-12'
            }`}
          >
            <span
              className="block w-full h-full rounded-full flex items-center justify-center text-[10px] font-black"
              style={{
                background: c.hex,
                borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)',
                color: c.id === 'white' || c.id === 'yellow' ? '#1b1b1f' : '#fff',
              }}
            >
              {colorblindMode ? COLOR_PATTERNS[c.id] : ''}
            </span>
          </HoverButton>
        );
      })}
    </div>
  );
}
