import { useCallback, useEffect, useRef, useState } from 'react';
import { useGestureRef } from './useGesture';

interface UseTubeInteractionOptions {
  tubeRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onPour: (from: number, to: number) => void;
  enabled: boolean;
}

/** Holding the cursor on a tube this long picks it (or pours into it once one is picked). */
const HOLD_MS = 800;
/** One missed tracking frame should not restart a hold. */
const GRACE_MS = 250;

/**
 * Hold on a tube to lift it, then hold on another to pour into it. Holding on the
 * lifted tube again puts it down. A pinch completes the current hold at once.
 */
export function useTubeInteraction({ tubeRefs, onPour, enabled }: UseTubeInteractionOptions) {
  const gestureRef = useGestureRef();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const grabbedRef = useRef<number | null>(null);
  // The caller passes a new onPour every render; restarting the loop for it wiped the "just poured here" guard,
  // so the hand still resting on the target lifted it and the next hold poured it straight back.
  const onPourRef = useRef(onPour);
  onPourRef.current = onPour;

  const clearSelection = useCallback(() => {
    grabbedRef.current = null;
    setGrabbedIndex(null);
  }, []);

  useEffect(() => {
    let raf = 0;
    let holdIdx: number | null = null;
    let holdStart = 0;
    let lastSeen = 0;
    // After an action the hand must leave that tube before it can act on it again.
    let spentIdx: number | null = null;
    let wasPinching = false;

    function loop() {
      if (!enabled) {
        holdIdx = null;
        setHoldProgress(0);
        raf = requestAnimationFrame(loop);
        return;
      }
      const now = performance.now();
      const g = gestureRef.current;
      let idx: number | null = null;
      if (g.isHovering) {
        const px = g.cursorX * window.innerWidth;
        const py = g.cursorY * window.innerHeight;
        const els = tubeRefs.current;
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          // A little slack around each tube: the cursor shakes at TV distance.
          if (px >= r.left - 16 && px <= r.right + 16 && py >= r.top - 24 && py <= r.bottom + 24) {
            idx = i;
            break;
          }
        }
      }
      setHoveredIndex(idx);

      if (idx !== null) lastSeen = now;
      if (idx !== spentIdx && (idx !== null || now - lastSeen > GRACE_MS)) spentIdx = null;

      if (idx !== null && idx !== holdIdx) {
        holdIdx = idx;
        holdStart = now;
      } else if (idx === null && holdIdx !== null && now - lastSeen > GRACE_MS) {
        holdIdx = null;
      }

      const pinchEdge = g.isPinching && !wasPinching;
      wasPinching = g.isPinching;

      if (holdIdx !== null && holdIdx !== spentIdx) {
        const p = Math.min(1, (now - holdStart) / HOLD_MS);
        setHoldProgress(p);
        if (p >= 1 || (pinchEdge && idx === holdIdx)) {
          const target = holdIdx;
          spentIdx = target;
          holdIdx = null;
          setHoldProgress(0);
          if (grabbedRef.current === null) {
            grabbedRef.current = target;
            setGrabbedIndex(target);
          } else if (grabbedRef.current === target) {
            clearSelection();
          } else {
            onPourRef.current(grabbedRef.current, target);
            clearSelection();
          }
        }
      } else {
        setHoldProgress(0);
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, tubeRefs, gestureRef, clearSelection]);

  return { hoveredIndex, selectedIndex: grabbedIndex, holdProgress, clearSelection };
}
