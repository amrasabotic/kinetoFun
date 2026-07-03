import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import PetSprite from './PetSprite';
import CareTray from './CareTray';
import { usePetStore, ACHIEVEMENTS } from '../../stores/petStore';
import { usePinchDrag, type DragPayload } from '../../hooks/usePinchDrag';
import { itemById } from '../../data/careItems';
import { computeStats } from '../../game/petStats';
import { playConfirm, playCorrect, playTryAgain, playUnlock } from '../../audio/sound';

interface Props {
  onExit: () => void;
}

export default function PetScreen({ onExit }: Props) {
  const pet = usePetStore();
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);
  const toastTimerRef = useRef<number>();

  const petRef = useRef<HTMLDivElement | null>(null);
  const trayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const petDropZoneRef = useRef<HTMLDivElement | null>(null);

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
    if (dropZoneId !== 'pet-drop-zone') return;
    const item = itemById(payload.cropId); // usePinchDrag uses 'cropId' field for the dragged item ID
    if (!item) return;

    let success = false;
    let newAchievements: string[] = [];

    if (item.kind === 'food') {
      success = pet.feedPet(payload.cropId);
    } else if (item.kind === 'toy') {
      success = pet.playWithPet(payload.cropId);
    }

    if (success) {
      playCorrect();
      const state = pet; // Updated state is already in the store
      newAchievements = state.achievements.filter(
        (id) => !pet.achievements.includes(id),
      );
      showAchievements(newAchievements);
    } else {
      playTryAgain();
    }
  }

  const stats = computeStats(
    pet.lastHungerTickAt,
    pet.lastHappinessTickAt,
    pet.totalCareActions,
    now,
  );

  const { held, cursorPx } = usePinchDrag({
    getGrabbables: () => {
      const list = [];
      for (const itemId of pet.unlockedItemIds) {
        const el = trayRefs.current[itemId];
        const item = itemById(itemId);
        if (!el || !item || (item.kind !== 'food' && item.kind !== 'toy')) continue;
        list.push({
          id: `item-${itemId}`,
          rect: el.getBoundingClientRect(),
          data: { kind: item.kind as 'food' | 'toy', cropId: itemId, emoji: item.emoji } as any,
        });
      }
      return list;
    },
    getDropzones: () => {
      if (!petDropZoneRef.current) return [];
      return [{ id: 'pet-drop-zone', rect: petDropZoneRef.current.getBoundingClientRect(), data: null }];
    },
    onDrop: (payload: any, dropZoneId: string) => handleDrop(payload, dropZoneId),
  });

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-5 py-2">
          <span className="text-lg font-extrabold">❤️ {pet.hearts}</span>
          <span className="text-sm text-white/60">🎯 {pet.totalCareActions} actions</span>
        </div>
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/30 border border-white/15 text-xs font-semibold">
          Back to Menu
        </HoverButton>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div ref={petDropZoneRef} className="relative">
          <PetSprite growthStage={stats.growthStage} mood={stats.mood} petRef={(el) => (petRef.current = el)} onPet={() => { const ok = pet.petPat(); if (ok) playConfirm(); }} />
        </div>

        <div className="flex gap-6 text-sm">
          <div className="bg-black/20 px-4 py-2 rounded-full">
            <p className="text-white/60">Hunger</p>
            <div className="w-32 h-2 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${((stats.hunger - 40) / 60) * 100}%` }} />
            </div>
            <p className="text-white font-bold mt-1">{Math.round(stats.hunger)}/100</p>
          </div>
          <div className="bg-black/20 px-4 py-2 rounded-full">
            <p className="text-white/60">Happiness</p>
            <div className="w-32 h-2 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-pink-500" style={{ width: `${((stats.happiness - 40) / 60) * 100}%` }} />
            </div>
            <p className="text-white font-bold mt-1">{Math.round(stats.happiness)}/100</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <CareTray hearts={pet.hearts} unlockedItemIds={pet.unlockedItemIds} tileRef={(itemId, el) => (trayRefs.current[itemId] = el)} onUnlockItem={(itemId) => { const ok = pet.unlockItem(itemId); if (ok) playUnlock(); }} />
      </div>

      {held && (
        <div className="fixed z-[9998] pointer-events-none text-4xl drop-shadow-lg" style={{ left: cursorPx.x, top: cursorPx.y, transform: 'translate(-50%, -50%)' }}>
          {itemById(held.cropId)?.emoji}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.title} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/70 border border-yellow-300/40 rounded-2xl px-6 py-3 text-center">
            <p className="text-yellow-300 font-extrabold text-sm">🏆 {toast.title}</p>
            <p className="text-white/70 text-xs">{toast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2 text-center text-xs text-white/30">Pinch food/toys and drop on your pal · Hover over your pal to pet it</p>
    </div>
  );
}
