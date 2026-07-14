import HoverButton from '../common/HoverButton';
import { getGrowthEmoji } from '../../game/petStats';
import type { GrowthStage, MoodTier } from '../../game/petStats';

interface Props {
  growthStage: GrowthStage;
  mood: MoodTier;
  petRef: (el: HTMLDivElement | null) => void;
  onPet: () => void;
}

const scaleMap: Record<GrowthStage, number> = { baby: 0.8, child: 1, teen: 1.2, adult: 1.4, elder: 1.5 };
const moodEmoji = { joyful: '✨', happy: '😊', okay: '💧' };

export default function PetSprite({ growthStage, mood, petRef, onPet }: Props) {
  return (
    <HoverButton
      onActivate={onPet}
      dwellMs={700}
      ringColor="#FF1493"
      className="flex items-center justify-center w-40 h-40 rounded-full bg-gradient-to-br from-yellow-100/40 to-pink-100/40 border-4 border-white/20"
    >
      <div ref={petRef} className="relative flex flex-col items-center gap-2">
        <div style={{ fontSize: `${48 * scaleMap[growthStage]}px` }}>
          {getGrowthEmoji(growthStage)}
        </div>
        {mood === 'okay' && (
          <div className="absolute -bottom-6 text-2xl animate-bounce">
            {moodEmoji[mood]}
          </div>
        )}
      </div>
    </HoverButton>
  );
}
