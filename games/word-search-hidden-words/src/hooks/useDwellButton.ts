import { useEffect, useRef, useState } from 'react';
import { useGestureRef } from './useGesture';

// A button ignores the cursor for a moment after it appears, so a hand
// already resting where a new screen puts a button does not press it.
const ARM_MS = 1500;

/**
 * Generic gesture-activated button: hovering the cursor over the bound
 * element for `holdMs` fires `onActivate`. Keeps every UI control on the
 * same hover-dwell language as grid selection — no clicks anywhere.
 */
export function useDwellButton(holdMs: number, onActivate: () => void) {
  const elRef = useRef<HTMLDivElement>(null);
  const gestureRef = useGestureRef();
  const [progress, setProgress] = useState(0);
  const sinceRef = useRef(0);
  const wasOverRef = useRef(false);
  const firedRef = useRef(false);
  const shownAtRef = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    function loop() {
      const el = elRef.current;
      const gesture = gestureRef.current;
      if (el && gesture.isHovering) {
        const rect = el.getBoundingClientRect();
        const px = gesture.cursorX * window.innerWidth;
        const py = gesture.cursorY * window.innerHeight;
        const now = performance.now();
        const isOver =
          now - shownAtRef.current >= ARM_MS &&
          px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
        if (isOver) {
          if (!wasOverRef.current) {
            sinceRef.current = now;
            firedRef.current = false;
          }
          const elapsed = now - sinceRef.current;
          setProgress(Math.min(1, elapsed / holdMs));
          if (elapsed >= holdMs && !firedRef.current) {
            firedRef.current = true;
            onActivate();
          }
        } else {
          setProgress(0);
        }
        wasOverRef.current = isOver;
      } else {
        wasOverRef.current = false;
        setProgress(0);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [holdMs, onActivate, gestureRef]);

  return { elRef, progress };
}
