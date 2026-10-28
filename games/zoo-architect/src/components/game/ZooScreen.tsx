import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import ZoneCanvas, { type Gain } from './ZoneCanvas';
import ShopTray from './ShopTray';
import { useZooStore, ACHIEVEMENTS, totalAppealScore, isHappy } from '../../stores/zooStore';
import { usePinchDrag, type DragPayload } from '../../hooks/usePinchDrag';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { itemById, itemsByZone } from '../../data/zooItems';
import { ZONES, zoneById, nextZoneId } from '../../data/zones';
import { computeAccruedTickets } from '../../game/ticketAccrual';
import { playConfirm, playCorrect, playTryAgain, playUnlock } from '../../audio/sound';

interface Props {
  onExit: () => void;
}

// A carried item lands where the hand stays within this many pixels for PLACE_MS.
const PLACE_MS = 900;
const PLACE_STILL_PX = 40;
// Feeding: hold the hand on an animal, then it is full for a while before it can eat again.
const FEED_MS = 900;
const FULL_MS = 20000;
const FEED_TICKETS = 3;

export default function ZooScreen({ onExit }: Props) {
  const zoo = useZooStore();
  const { frame } = useGesture();
  const [activeZoneId, setActiveZoneId] = useState('savanna');
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);
  const toastTimerRef = useRef<number>();

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const trayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const animalRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [carryId, setCarryId] = useState<string | null>(null);
  const [placeProgress, setPlaceProgress] = useState(0);
  const placeAnchor = useRef<{ x: number; y: number; at: number } | null>(null);

  const [feeding, setFeeding] = useState<{ index: number; progress: number } | null>(null);
  const feedStart = useRef<{ index: number; at: number } | null>(null);
  const fullUntil = useRef<Record<string, number>>({});
  const [jumping, setJumping] = useState<number | null>(null);
  const [gains, setGains] = useState<Gain[]>([]);
  const gainId = useRef(0);

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

  function addGain(x: number, y: number, text: string) {
    const id = ++gainId.current;
    setGains((g) => [...g, { id, x, y, text }]);
    window.setTimeout(() => setGains((g) => g.filter((e) => e.id !== id)), 1400);
  }

  function placeAt(itemId: string, px: number, py: number): boolean {
    const canvas = canvasRef.current;
    if (!canvas || !itemById(itemId)) return false;
    const rect = canvas.getBoundingClientRect();
    // Kept off the very edge so the item and its hearts stay fully in view.
    const relX = Math.max(0.06, Math.min(0.94, (px - rect.left) / rect.width));
    const relY = Math.max(0.12, Math.min(0.8, (py - rect.top) / rect.height));
    const before = zoo.achievements;
    const success = zoo.placeItem(itemId, activeZoneId, relX, relY);
    if (success) {
      playCorrect();
      const after = useZooStore.getState().achievements;
      showAchievements(after.filter((id) => !before.includes(id)));
    } else {
      playTryAgain();
    }
    return success;
  }

  function handleDrop(payload: DragPayload, dropZoneId: string) {
    if (dropZoneId !== 'zone-canvas') return;
    placeAt(payload.itemId, cursorPx.x, cursorPx.y);
  }

  const zone = zoneById(activeZoneId)!;
  const placedInZone = zoo.placedItems.filter((p) => p.zoneId === activeZoneId);
  const happy = new Set(placedInZone.map((p, i) => (isHappy(p, zoo.placedItems) ? i : -1)).filter((i) => i >= 0));
  const full = new Set(placedInZone.map((_, i) => ((fullUntil.current[`${activeZoneId}:${i}`] ?? 0) > now ? i : -1)).filter((i) => i >= 0));
  const appeal = totalAppealScore(zoo.placedItems);
  const accruedLive = computeAccruedTickets(zoo.lastCollectedAt, appeal, now);
  const visitors = appeal > 0 ? Math.min(6, Math.ceil(appeal / 12)) : 0;

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

  // Hold-to-place for a carried item, and hold-to-feed on animals, both driven by the hand position.
  useEffect(() => {
    const t = performance.now();
    const px = frame.cursorX * window.innerWidth;
    const py = frame.cursorY * window.innerHeight;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const inCanvas = !!canvasRect && frame.detected &&
      px >= canvasRect.left && px <= canvasRect.right && py >= canvasRect.top && py <= canvasRect.bottom;

    if (carryId) {
      feedStart.current = null;
      if (feeding) setFeeding(null);
      if (!inCanvas) { placeAnchor.current = null; setPlaceProgress(0); return; }
      const a = placeAnchor.current;
      if (!a || Math.hypot(px - a.x, py - a.y) > PLACE_STILL_PX) {
        placeAnchor.current = { x: px, y: py, at: t };
        setPlaceProgress(0);
        return;
      }
      const p = Math.min(1, (t - a.at) / PLACE_MS);
      setPlaceProgress(p);
      if (p >= 1) {
        placeAt(carryId, a.x, a.y);
        setCarryId(null);
        placeAnchor.current = null;
        setPlaceProgress(0);
      }
      return;
    }

    let over = -1;
    if (inCanvas && !held) {
      for (const [key, el] of Object.entries(animalRefs.current)) {
        const r = el?.getBoundingClientRect();
        if (r && px >= r.left - 10 && px <= r.right + 10 && py >= r.top - 10 && py <= r.bottom + 10) { over = Number(key); break; }
      }
    }
    const fullKey = `${activeZoneId}:${over}`;
    if (over < 0 || (fullUntil.current[fullKey] ?? 0) > Date.now()) {
      feedStart.current = null;
      if (feeding) setFeeding(null);
      return;
    }
    if (feedStart.current?.index !== over) feedStart.current = { index: over, at: t };
    const p = Math.min(1, (t - feedStart.current.at) / FEED_MS);
    setFeeding({ index: over, progress: p });
    if (p >= 1) {
      fullUntil.current[fullKey] = Date.now() + FULL_MS;
      feedStart.current = null;
      setFeeding(null);
      zoo.earnTickets(FEED_TICKETS);
      playConfirm();
      setJumping(over);
      window.setTimeout(() => setJumping((j) => (j === over ? null : j)), 1200);
      const r = animalRefs.current[over]?.getBoundingClientRect();
      if (r && canvasRect) addGain(r.left - canvasRect.left + r.width / 2, r.top - canvasRect.top - 10, `+${FEED_TICKETS} 🎟️`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.cursorX, frame.cursorY, frame.detected]);

  function changeZone(id: string) {
    animalRefs.current = {};
    setCarryId(null);
    setActiveZoneId(id);
  }

  const nextZone = nextZoneId(zoo.unlockedZoneIds);
  const nextZoneDef = nextZone ? zoneById(nextZone) : null;
  const carried = carryId ?? held?.itemId ?? null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 flex flex-col text-white p-5">
      <div className="flex items-center justify-between mb-3 pl-56">
        <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-5 py-2">
          <span className="text-2xl font-extrabold">🎟️ {Math.floor(zoo.tickets)}</span>
          <span className="text-lg text-white/70">✨ Appeal {appeal}</span>
        </div>
        <HoverButton onActivate={onExit} dwellMs={1200} ringColor="#E4362E" className="px-5 py-3 rounded-full bg-black/30 border border-white/15 text-base font-semibold">
          Back to Menu
        </HoverButton>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {ZONES.map((z) => {
          const unlocked = zoo.unlockedZoneIds.includes(z.id);
          const isNext = z.id === nextZone;
          if (unlocked) {
            return (
              <HoverButton
                key={z.id}
                onActivate={() => changeZone(z.id)}
                ringColor="#4AD9A4"
                dwellMs={700}
                className={`px-5 py-3 rounded-full text-lg font-bold ${activeZoneId === z.id ? 'bg-white/20 border border-white/40' : 'bg-black/20 border border-white/10'}`}
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
                  if (ok) { playUnlock(); changeZone(z.id); }
                }
              }}
              disabled={!isNext || zoo.tickets < z.unlockCost}
              ringColor="#D9A441"
              dwellMs={900}
              className="px-5 py-3 rounded-full text-lg font-bold bg-black/20 border-2 border-dashed border-white/15 text-white/60"
            >
              🔒 {z.name} ({z.unlockCost}🎟️)
            </HoverButton>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <ZoneCanvas
          zone={zone}
          placedItems={placedInZone}
          happy={happy}
          feeding={feeding}
          full={full}
          jumping={jumping}
          gains={gains}
          visitors={visitors}
          canvasRef={(el) => (canvasRef.current = el)}
          animalRef={(i, el) => { animalRefs.current[i] = el; }}
        />

        <div className="flex items-center justify-between gap-3">
          <ShopTray
            zoneId={activeZoneId}
            tickets={zoo.tickets}
            unlockedItemIds={zoo.unlockedItemIds}
            carryingId={carryId}
            tileRef={(itemId, el) => (trayRefs.current[itemId] = el)}
            onUnlockItem={(itemId) => { const ok = zoo.unlockItem(itemId); if (ok) playUnlock(); }}
            onPick={(itemId) => { setCarryId((c) => (c === itemId ? null : itemId)); playConfirm(); }}
          />

          <HoverButton
            onActivate={() => {
              const gained = zoo.collectTickets();
              if (gained > 0) playConfirm();
            }}
            ringColor="#F5C518"
            dwellMs={800}
            className="px-6 py-4 rounded-2xl bg-yellow-500/20 border border-yellow-300/40 text-lg font-bold text-yellow-200 flex flex-col items-center gap-1"
          >
            <span>Collect Tickets</span>
            <span className="text-base text-yellow-300/80">+{accruedLive.toFixed(1)} ready</span>
          </HoverButton>
        </div>
      </div>

      {carried && frame.detected && (
        <div className="fixed z-[9998] pointer-events-none" style={{ left: cursorPx.x, top: cursorPx.y, transform: 'translate(-50%, -50%)' }}>
          <div className="relative text-6xl drop-shadow-lg">
            {itemById(carried)?.emoji}
            {placeProgress > 0 && (
              <svg className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="none" stroke="#86EFAC" strokeWidth="3" strokeDasharray={`${placeProgress * 113} 113`} strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.title} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/70 border border-yellow-300/40 rounded-2xl px-6 py-3 text-center">
            <p className="text-yellow-300 font-extrabold text-lg">🏆 {toast.title}</p>
            <p className="text-white/70 text-base">{toast.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2 text-center text-base text-white/60">
        {carried
          ? 'Hold still in the habitat to place it · hold on the same tile to put it back'
          : 'Hold your hand on an animal to feed it 🎟️ · put its ❤️ favourite nearby to double its appeal'}
        {nextZoneDef && !carried && ` · ${nextZoneDef.name} opens at ${nextZoneDef.unlockCost} 🎟️`}
      </p>
    </div>
  );
}
