import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import Plot from './Plot';
import SeedTray from './SeedTray';
import Basket from './Basket';
import { useFarmStore, ACHIEVEMENTS } from '../../stores/farmStore';
import { usePinchDrag, type DragPayload } from '../../hooks/usePinchDrag';
import { MAX_PLOT_COUNT, cropById, plotUnlockCost } from '../../data/crops';
import { getGrowthFraction } from '../../game/growth';
import { playConfirm, playCorrect, playTryAgain, playUnlock } from '../../audio/sound';

interface Props {
  onExit: () => void;
}

export default function FarmScreen({ onExit }: Props) {
  const farm = useFarmStore();
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);
  const toastTimerRef = useRef<number>();

  const plotRefs = useRef<Array<HTMLDivElement | null>>(Array(MAX_PLOT_COUNT).fill(null));
  const trayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const basketRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  function showAchievements(ids: string[]) {
    if (!ids.length) return;
    const def = ACHIEVEMENTS.find((a) => a.id === ids[0]);
    if (!def) return;
    playUnlock();
    setToast({ title: def.title, description: def.description });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }

  function handleDrop(payload: DragPayload, dropZoneId: string) {
    if (payload.kind === 'seed' && dropZoneId.startsWith('plot-')) {
      const idx = Number(dropZoneId.split('-')[1]);
      const ok = farm.plantCrop(idx, payload.cropId);
      if (ok) playConfirm(); else playTryAgain();
      return;
    }
    if (payload.kind === 'crop' && dropZoneId === 'basket') {
      const result = farm.harvestCrop(payload.plotIndex!);
      if (result) {
        playCorrect();
        showAchievements(result.newAchievements);
      }
    }
  }

  const { held, cursorPx } = usePinchDrag({
    getGrabbables: () => {
      const list = [];
      for (const cropId of farm.unlockedCropIds) {
        const el = trayRefs.current[cropId];
        const crop = cropById(cropId);
        if (!el || !crop || farm.coins < crop.seedCost) continue;
        list.push({ id: `seed-${cropId}`, rect: el.getBoundingClientRect(), data: { kind: 'seed' as const, cropId, emoji: crop.seedEmoji } });
      }
      farm.plots.forEach((plot, i) => {
        if (i >= farm.unlockedPlotCount || !plot.cropId || plot.plantedAt === null) return;
        const crop = cropById(plot.cropId);
        if (!crop) return;
        if (getGrowthFraction(plot.plantedAt, crop.growMs, Date.now()) < 1) return;
        const el = plotRefs.current[i];
        if (!el) return;
        list.push({ id: `plot-${i}`, rect: el.getBoundingClientRect(), data: { kind: 'crop' as const, cropId: plot.cropId, plotIndex: i, emoji: crop.ripeEmoji } });
      });
      return list;
    },
    getDropzones: () => {
      const list = [];
      farm.plots.forEach((plot, i) => {
        if (i >= farm.unlockedPlotCount || plot.cropId !== null) return;
        const el = plotRefs.current[i];
        if (!el) return;
        list.push({ id: `plot-${i}`, rect: el.getBoundingClientRect(), data: null });
      });
      if (basketRef.current) list.push({ id: 'basket', rect: basketRef.current.getBoundingClientRect(), data: null });
      return list;
    },
    onDrop: handleDrop,
  });

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a5e1a] via-[#1e4a16] to-[#0f2410] flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-5 py-2">
          <span className="text-lg font-extrabold">💰 {farm.coins}</span>
          <span className="text-sm text-white/60">🌾 {farm.totalHarvests} harvested</span>
        </div>
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/30 border border-white/15 text-xs font-semibold">
          Back to Menu
        </HoverButton>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 grid-rows-3 gap-3">
          {Array.from({ length: MAX_PLOT_COUNT }, (_, i) => (
            <Plot
              key={i}
              plot={farm.plots[i]}
              unlocked={i < farm.unlockedPlotCount}
              buyable={i === farm.unlockedPlotCount}
              buyCost={plotUnlockCost(i)}
              now={now}
              isHeld={!!held && held.kind === 'seed'}
              plotRef={(el) => { plotRefs.current[i] = el; }}
              onBuyPlot={farm.buyPlot}
            />
          ))}
        </div>
      </div>

      <div className="flex items-end justify-center gap-4">
        <SeedTray
          coins={farm.coins}
          unlockedCropIds={farm.unlockedCropIds}
          tileRef={(cropId, el) => { trayRefs.current[cropId] = el; }}
          onUnlockCrop={(cropId) => { const ok = farm.unlockCrop(cropId); if (ok) playUnlock(); }}
        />
        <Basket basketRef={(el) => { basketRef.current = el; }} isHeld={!!held && held.kind === 'crop'} />
      </div>

      {held && (
        <div
          className="fixed z-[9998] pointer-events-none text-5xl drop-shadow-lg"
          style={{ left: cursorPx.x, top: cursorPx.y, transform: 'translate(-50%, -50%)' }}
        >
          {held.emoji}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/70 border border-yellow-300/40 rounded-2xl px-6 py-3 text-center"
          >
            <p className="text-yellow-300 font-extrabold text-sm">🏆 {toast.title}</p>
            <p className="text-white/70 text-xs">{toast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 text-center text-xs text-white/30">
        Pinch a seed and drop it on a plot to plant · Pinch a ripe crop and drop it in the basket to harvest
      </p>
    </div>
  );
}
