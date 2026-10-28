import HoverButton from '../common/HoverButton';
import { itemById, itemsByZone } from '../../data/zooItems';

interface Props {
  zoneId: string;
  tickets: number;
  unlockedItemIds: string[];
  /** Item currently being carried, shown as picked up. */
  carryingId: string | null;
  tileRef: (itemId: string, el: HTMLDivElement | null) => void;
  onUnlockItem: (itemId: string) => void;
  onPick: (itemId: string) => void;
}

export default function ShopTray({ zoneId, tickets, unlockedItemIds, carryingId, tileRef, onUnlockItem, onPick }: Props) {
  const items = itemsByZone(zoneId);

  return (
    <div className="flex flex-col gap-2 bg-black/25 border border-white/10 rounded-2xl px-4 py-3">
      <p className="text-sm font-bold text-white/70 uppercase">Animals & Decor · ❤️ shows each animal's favourite</p>
      <div className="flex gap-2 flex-wrap max-w-4xl">
        {items.map((item) => {
          const unlocked = unlockedItemIds.includes(item.id);
          if (!unlocked) {
            const affordable = tickets >= item.unlockCost;
            return (
              <HoverButton
                key={item.id}
                onActivate={() => onUnlockItem(item.id)}
                disabled={!affordable}
                dwellMs={900}
                ringColor="#4AD9A4"
                className="flex flex-col items-center justify-center gap-0.5 w-24 h-24 rounded-xl bg-black/20 border-2 border-dashed border-white/20"
              >
                <span className="text-3xl opacity-60">{item.emoji}</span>
                <span className="text-sm font-bold text-white/80">🔒 {item.unlockCost}🎟️</span>
              </HoverButton>
            );
          }
          const favourite = item.likes ? itemById(item.likes)?.emoji : null;
          return (
            <HoverButton key={item.id} onActivate={() => onPick(item.id)} dwellMs={800} ringColor="#8C5CFF">
              <div
                ref={(el) => tileRef(item.id, el)}
                className={`relative flex flex-col items-center justify-center gap-0.5 w-24 h-24 rounded-xl border-2 ${
                  carryingId === item.id ? 'bg-violet-500/40 border-violet-300' : 'bg-white/10 border-white/15'
                }`}
              >
                <span className="text-4xl">{item.emoji}</span>
                <span className="text-xs font-bold text-white/80 leading-tight">{item.name}</span>
                {favourite && <span className="absolute -top-2 -right-2 rounded-full bg-black/60 px-1 text-sm">❤️{favourite}</span>}
              </div>
            </HoverButton>
          );
        })}
      </div>
    </div>
  );
}
