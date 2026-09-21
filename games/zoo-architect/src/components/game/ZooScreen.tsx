import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import ZoneCanvas from './ZoneCanvas';
import ShopTray from './ShopTray';
import { useZooStore, ACHIEVEMENTS, totalAppealScore } from '../../stores/zooStore';
import { usePinchDrag, type DragPayload } from '../../hooks/usePinchDrag';
import { itemById, itemsByZone } from '../../data/zooItems';
import { ZONES, zoneById, nextZoneId } from '../../data/zones';
import { computeAccruedTickets } from '../../game/ticketAccrual';
import { playConfirm, playCorrect, playTryAgain, playUnlock } from '../../audio/sound';

interface Props {
  onExit: () => void;
}

export default function ZooScreen({ onExit }: Props) {
  const zoo = useZooStore();
  const [activeZoneId, setActiveZoneId] = useState('savanna');
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);
  const toastTimerRef = useRef<number>();

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const trayRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    if (dropZoneId !== 'zone-canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const item = itemById(payload.itemId);
    if (!item) return;

    const rect = canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (cursorPx.x - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (cursorPx.y - rect.top) / rect.height));

    const before = zoo.achievements;
    const success = zoo.placeItem(payload.itemId, activeZoneId, relX, relY);

    if (success) {
      playCorrect();
      const after = useZooStore.getState().achievements;
      showAchievements(after.filter((id) => !before.includes(id)));
    } else {
      playTryAgain();
    }
  }

  const zone = zoneById(activeZoneId)!;
  const placedInZone = zoo.placedItems.filter((p) => p.zoneId === activeZoneId);
  const appeal = totalAppealScore(zoo.placedItems);
  const accruedLive = computeAccruedTickets(zoo.lastCollectedAt, appeal, now);

  const { held, cursorPx } = usePinchDrag({
    getGrabbables: () => {
      const list = [];
      for (const item of itemsByZone(activeZoneId)) {
        if (!zoo.unlockedItemIds.includes(item.id)) continue;
        const el = trayRefs.current[item.id];
        if (!el) continue;
        list.push({
          id: `item-${item.id}`,
          rect: el.getBoundingClientRect(),
          data: { kind: item.kind, itemId: item.id, emoji: item.emoji },
        });
      }
      return list;
    },
    getDropzones: () => {
      if (!canvasRef.current) return [];
      return [{ id: 'zone-canvas', rect: canvasRef.current.getBoundingClientRect(), data: null }];
    },
    onDrop: handleDrop,
  });

  const nextZone = nextZoneId(zoo.unlockedZoneIds);
  const nextZoneDef = nextZone ? zoneById(nextZone) : null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-5 py-2">
          <span className="text-lg font-extrabold">🎟️ {Math.floor(zoo.tickets)}</span>
          <span className="text-sm text-white/60">✨ Appeal {appeal}</span>
        </div>
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/30 border border-white/15 text-xs font-semibold">
          Back to Menu
        </HoverButton>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {ZONES.map((z) => {
          const unlocked = zoo.unlockedZoneIds.includes(z.id);
          const isNext = z.id === nextZone;
          if (unlocked) {
            return (
              <HoverButton
                key={z.id}
                onActivate={() => setActiveZoneId(z.id)}
                ringColor="#4AD9A4"
                dwellMs={500}
                className={`px-4 py-2 rounded-full text-sm font-bold ${activeZoneId === z.id ? 'bg-white/20 border border-white/40' : 'bg-black/20 border border-white/10'}`}
              >
                {z.name}
              </HoverButton>
            );
          }
          return (
            <HoverButton
              key={z.id}
              onActivate={() => {
                if (isNext) {
                  const ok = zoo.unlockZone(z.id);
                  if (ok) { playUnlock(); setActiveZoneId(z.id); }
                }
              }}
              disabled={!isNext || zoo.tickets < z.unlockCost}
              ringColor="#D9A441"
              dwellMs={800}
              className="px-4 py-2 rounded-full text-sm font-bold bg-black/20 border-2 border-dashed border-white/15 text-white/60"
            >
              🔒 {z.name} ({z.unlockCost}🎟️)
            </HoverButton>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <ZoneCanvas zone={zone} placedItems={placedInZone} canvasRef={(el) => (canvasRef.current = el)} />

        <div className="flex items-center justify-between">
          <ShopTray
            zoneId={activeZoneId}
            tickets={zoo.tickets}
            unlockedItemIds={zoo.unlockedItemIds}
            tileRef={(itemId, el) => (trayRefs.current[itemId] = el)}
            onUnlockItem={(itemId) => { const ok = zoo.unlockItem(itemId); if (ok) playUnlock(); }}
          />

          <HoverButton
            onActivate={() => { const gained = zoo.collectTickets(); if (gained > 0) playConfirm(); }}
            ringColor="#F5C518"
            dwellMs={700}
            className="px-6 py-4 rounded-2xl bg-yellow-500/20 border border-yellow-300/40 text-sm font-bold text-yellow-200 flex flex-col items-center gap-1"
          >
            <span>Collect Tickets</span>
            <span className="text-xs text-yellow-300/80">+{accruedLive.toFixed(1)} ready</span>
          </HoverButton>
        </div>
      </div>

      {held && (
        <div className="fixed z-[9998] pointer-events-none text-4xl drop-shadow-lg" style={{ left: cursorPx.x, top: cursorPx.y, transform: 'translate(-50%, -50%)' }}>
          {itemById(held.itemId)?.emoji}
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

      {nextZoneDef && zoo.tickets < nextZoneDef.unlockCost && (
        <p className="mt-2 text-center text-xs text-white/30">
          Pinch animals/decor and drop them in the habitat · Next zone: {nextZoneDef.name} needs {nextZoneDef.unlockCost} 🎟️
        </p>
      )}
    </div>
  );
}
