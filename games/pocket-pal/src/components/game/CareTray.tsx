import HoverButton from '../common/HoverButton';
import { CARE_ITEMS } from '../../data/careItems';

interface Props {
  hearts: number;
  unlockedItemIds: string[];
  tileRef: (itemId: string, el: HTMLDivElement | null) => void;
  onUnlockItem: (itemId: string) => void;
}

export default function CareTray({ hearts, unlockedItemIds, tileRef, onUnlockItem }: Props) {
  const foods = CARE_ITEMS.filter((i) => i.kind === 'food');
  const toys = CARE_ITEMS.filter((i) => i.kind === 'toy');

  return (
    <div className="flex flex-col gap-3 bg-black/25 border border-white/10 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-white/70 uppercase">Foods & Toys</p>
      <div className="flex gap-2">
        {foods.concat(toys).map((item) => {
          const unlocked = unlockedItemIds.includes(item.id);
          if (!unlocked) {
            const affordable = hearts >= item.unlockCost;
            return (
              <HoverButton
                key={item.id}
                onActivate={() => onUnlockItem(item.id)}
                disabled={!affordable}
                dwellMs={700}
                ringColor="#D9A441"
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-lg bg-black/20 border-2 border-dashed border-white/20"
              >
                <span className="text-sm opacity-50">🔒</span>
                <span className="text-[9px] font-bold text-white/70">{item.unlockCost}❤️</span>
              </HoverButton>
            );
          }
          return (
            <div
              key={item.id}
              ref={(el) => tileRef(item.id, el)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-lg bg-white/10 border-2 border-white/15"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[9px] font-bold text-white/80">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
