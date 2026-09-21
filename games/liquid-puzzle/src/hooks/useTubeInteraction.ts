import { useCallback, useEffect, useRef, useState } from 'react';
import { useGestureRef } from './useGesture';

interface UseTubeInteractionOptions {
  tubeRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onPour: (from: number, to: number) => void;
  enabled: boolean;
}

/**
 * Pinch over a tube to grab it; while still pinching, drag over a different
 * tube to pour into it — a direct drag-and-pour rather than the earlier
 * hover-hold-twice design, matching how you'd actually tip a bottle. Only
 * one pour fires per drag onto a given tube (guarded by `lastPourTargetRef`)
 * so lingering there doesn't repeat the pour every frame, but dragging back
 * off and onto it again (or onto a third tube) fires a fresh pour — closer
 * to physically redirecting the same held tube than a one-shot action.
 * Releasing the pinch drops the tube and ends the interaction.
 */
export function useTubeInteraction({ tubeRefs, onPour, enabled }: UseTubeInteractionOptions) {
  const gestureRef = useGestureRef();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const grabbedRef = useRef<number | null>(null);
  const lastPourTargetRef = useRef<number | null>(null);

  const clearSelection = useCallback(() => {
    grabbedRef.current = null;
    lastPourTargetRef.current = null;
    setGrabbedIndex(null);
  }, []);

  useEffect(() => {
    let raf = 0;
    function loop() {
      if (!enabled) {
        raf = requestAnimationFrame(loop);
        return;
      }
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
          if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
            idx = i;
            break;
          }
        }
      }
      setHoveredIndex(idx);

      if (g.isPinching) {
        if (grabbedRef.current === null) {
          if (idx !== null) {
            grabbedRef.current = idx;
            lastPourTargetRef.current = null;
            setGrabbedIndex(idx);
          }
        } else if (idx !== null && idx !== grabbedRef.current) {
          if (idx !== lastPourTargetRef.current) {
            lastPourTargetRef.current = idx;
            onPour(grabbedRef.current, idx);
          }
        } else {
          // Off any tube, or back over the source itself — clears the
          // "already poured here" guard so drifting back onto the same
          // destination fires another pour rather than staying silent.
          lastPourTargetRef.current = null;
        }
      } else if (grabbedRef.current !== null) {
        clearSelection();
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, tubeRefs, gestureRef, onPour, clearSelection]);

  return { hoveredIndex, selectedIndex: grabbedIndex, clearSelection };
}
