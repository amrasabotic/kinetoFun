import HoverButton from '../common/HoverButton';
import { CROPS } from '../../data/crops';

interface Props {
  coins: number;
  unlockedCropIds: string[];
  tileRef: (cropId: string, el: HTMLDivElement | null) => void;
  onUnlockCrop: (cropId: string) => void;
}

export default function SeedTray({ coins, unlockedCropIds, tileRef, onUnlockCrop }: Props) {
  return (
    <div className="flex items-center gap-3 bg-black/25 border border-white/10 rounded-2xl px-4 py-3">
      {CROPS.map((crop) => {
        const unlocked = unlockedCropIds.includes(crop.id);
        if (!unlocked) {
          const affordable = coins >= crop.unlockCost;
          return (
            <HoverButton
              key={crop.id}
              onActivate={() => onUnlockCrop(crop.id)}
              disabled={!affordable}
              dwellMs={700}
              ringColor="#D9A441"
              className="flex flex-col items-center justify-center gap-0.5 w-20 h-20 rounded-xl bg-black/20 border-2 border-dashed border-white/20"
            >
              <span className="text-xl opacity-50">🔒</span>
              <span className="text-[10px] font-bold text-white/70">Unlock {crop.unlockCost}💰</span>
            </HoverButton>
          );
        }
        return (
          <div
            key={crop.id}
            ref={(el) => tileRef(crop.id, el)}
            className="flex flex-col items-center justify-center gap-0.5 w-20 h-20 rounded-xl bg-white/10 border-2 border-white/15"
          >
            <span className="text-3xl">{crop.ripeEmoji}</span>
            <span className="text-[10px] font-bold text-white/80">{crop.seedCost}💰</span>
          </div>
        );
      })}
    </div>
  );
}
