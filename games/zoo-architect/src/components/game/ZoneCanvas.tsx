import type { ZoneDef } from '../../data/zones';
import type { PlacedItem } from '../../types';
import { itemById } from '../../data/zooItems';

interface Props {
  zone: ZoneDef;
  placedItems: PlacedItem[];
  canvasRef: (el: HTMLDivElement | null) => void;
}

export default function ZoneCanvas({ zone, placedItems, canvasRef }: Props) {
  return (
    <div
      ref={canvasRef}
      className={`relative w-full flex-1 rounded-2xl border border-white/15 bg-gradient-to-br ${zone.theme} overflow-hidden`}
    >
      {placedItems.map((p, i) => {
        const item = itemById(p.itemId);
        if (!item) return null;
        return (
          <div
            key={`${p.itemId}-${i}`}
            className="absolute text-4xl drop-shadow-lg select-none pointer-events-none"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            {item.emoji}
          </div>
        );
      })}
      {placedItems.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
          Pinch an animal or decoration and drop it here
        </p>
      )}
    </div>
  );
}
