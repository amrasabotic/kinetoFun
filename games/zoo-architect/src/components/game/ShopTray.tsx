import HoverButton from '../common/HoverButton';
import { itemsByZone } from '../../data/zooItems';

interface Props {
  zoneId: string;
  tickets: number;
  unlockedItemIds: string[];
  tileRef: (itemId: string, el: HTMLDivElement | null) => void;
  onUnlockItem: (itemId: string) => void;
}

export default function ShopTray({ zoneId, tickets, unlockedItemIds, tileRef, onUnlockItem }: Props) {
  const items = itemsByZone(zoneId);

  return (
    <div className="flex flex-col gap-3 bg-black/25 border border-white/10 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-white/70 uppercase">Animals & Decor</p>
      <div className="flex gap-2 flex-wrap max-w-3xl">
        {items.map((item) => {
          const unlocked = unlockedItemIds.includes(item.id);
          if (!unlocked) {
            const affordable = tickets >= item.unlockCost;
            return (
              <HoverButton
                key={item.id}
                onActivate={() => onUnlockItem(item.id)}
                disabled={!affordable}
                dwellMs={700}
                ringColor="#4AD9A4"
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-lg bg-black/20 border-2 border-dashed border-white/20"
              >
                <span className="text-sm opacity-50">🔒</span>
                <span className="text-[9px] font-bold text-white/70">{item.unlockCost}🎟️</span>
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
