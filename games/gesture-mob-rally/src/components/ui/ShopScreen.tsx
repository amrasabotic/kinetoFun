import { useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { cosmeticsByCategory } from '../../game/cosmetics/cosmeticDefs';
import type { CosmeticCategory } from '../../types';
import HoverButton from '../common/HoverButton';

const CATEGORIES: { id: CosmeticCategory; label: string }[] = [
  { id: 'colorTheme', label: 'Colors' },
  { id: 'hat', label: 'Hats' },
  { id: 'cape', label: 'Capes' },
  { id: 'trail', label: 'Trails' },
  { id: 'aura', label: 'Auras' },
];

export default function ShopScreen({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<CosmeticCategory>('colorTheme');
  const save = useGameStore((s) => s.save);
  const purchaseCosmetic = useGameStore((s) => s.purchaseCosmetic);
  const selectCosmetic = useGameStore((s) => s.selectCosmetic);

  const items = cosmeticsByCategory(category);

  return (
    <div className="absolute inset-0 bg-[#12101a] text-white flex flex-col px-8 py-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">🎩 Shop</h1>
        <div className="flex items-center gap-4">
          <span className="text-amber-300 font-bold">🪙 {save.coins}</span>
          <HoverButton onSelect={onBack} className="rounded-full overflow-hidden">
            <div className="px-4 py-1.5 bg-white/10 text-sm font-bold">Back</div>
          </HoverButton>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <HoverButton key={c.id} onSelect={() => setCategory(c.id)} className="rounded-full overflow-hidden">
            <div className={`px-4 py-1.5 text-sm font-bold ${category === c.id ? 'bg-orange-500' : 'bg-white/10'}`}>
              {c.label}
            </div>
          </HoverButton>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {items.map((item) => {
          const unlocked = save.unlockedCosmetics.includes(item.id);
          const selected = save.selectedCosmetics[category] === item.id;
          return (
            <HoverButton
              key={item.id}
              className="rounded-2xl overflow-hidden"
              onSelect={() => {
                if (unlocked) selectCosmetic(item.id, category);
                else purchaseCosmetic(item.id, category, item.cost);
              }}
            >
              <div className={`p-4 border-2 flex flex-col items-center gap-2 ${
                selected ? 'border-orange-400 bg-orange-400/10' : 'border-white/10 bg-white/5'
              }`}>
                <div className="w-12 h-12 rounded-full" style={{ background: item.color ?? '#6B7280' }} />
                <span className="text-sm font-bold">{item.label}</span>
                {unlocked ? (
                  <span className="text-xs text-emerald-400 font-bold">{selected ? 'Equipped' : 'Owned'}</span>
                ) : (
                  <span className="text-xs text-amber-300 font-bold">🪙 {item.cost}</span>
                )}
              </div>
            </HoverButton>
          );
        })}
      </div>
    </div>
  );
}
