import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import ProgressRing from '../common/ProgressRing';
import { cropById } from '../../data/crops';
import { getGrowthFraction, getGrowthStage } from '../../game/growth';
import type { PlotState } from '../../types';

interface Props {
  plot: PlotState;
  unlocked: boolean;
  buyable: boolean;
  buyCost: number;
  now: number;
  isHeld: boolean;
  plotRef: (el: HTMLDivElement | null) => void;
  onBuyPlot: () => void;
}

export default function Plot({ plot, unlocked, buyable, buyCost, now, isHeld, plotRef, onBuyPlot }: Props) {
  if (!unlocked) {
    if (buyable) {
      return (
        <HoverButton
          onActivate={onBuyPlot}
          dwellMs={700}
          ringColor="#D9A441"
          className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl bg-black/20 border-2 border-dashed border-white/25"
        >
          <span className="text-2xl">🔒</span>
          <span className="text-[11px] font-bold text-white/80">Buy {buyCost}💰</span>
        </HoverButton>
      );
    }
    return (
      <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-black/10 border border-white/10 opacity-40">
        <span className="text-xl">🔒</span>
      </div>
    );
  }

  if (!plot.cropId || plot.plantedAt === null) {
    return (
      <div
        ref={plotRef}
        className={`flex items-center justify-center w-24 h-24 rounded-2xl bg-[#5b3a22]/60 border-2 border-dashed transition-colors ${
          isHeld ? 'border-yellow-300 bg-[#5b3a22]/90' : 'border-white/20'
        }`}
      >
        <span className="text-2xl opacity-30">+</span>
      </div>
    );
  }

  const crop = cropById(plot.cropId);
  if (!crop) return null;
  const fraction = getGrowthFraction(plot.plantedAt, crop.growMs, now);
  const stage = getGrowthStage(fraction);
  const emoji = stage === 'seed' ? crop.seedEmoji : stage === 'growing' ? crop.sproutEmoji : crop.ripeEmoji;

  return (
    <div
      ref={stage === 'ripe' ? plotRef : undefined}
      className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-[#5b3a22]/60 border-2 border-white/15"
    >
      {stage === 'ripe' ? (
        <motion.span
          className="text-4xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          {emoji}
        </motion.span>
      ) : (
        <>
          <span className="text-3xl">{emoji}</span>
          <div className="absolute -bottom-1 -right-1 w-[34px] h-[34px]">
            <div className="relative w-full h-full">
              <ProgressRing progress={fraction} size={34} color="#2FA35A" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
