import { useEffect, useRef, useState } from 'react';
import { useGestureRef } from './useGesture';
import { buttonPointer } from '../sharedCursor';

/**
 * Generic gesture-activated button: hovering the cursor over the bound
 * element for `holdMs` fires `onActivate`. Keeps every menu/HUD control off
 * the mouse — index finger points, dwell time confirms.
 */
export function useDwellButton(holdMs: number, onActivate: () => void, armMs = 1500) {
  const elRef = useRef<HTMLDivElement>(null);
  const gestureRef = useGestureRef();
  const [progress, setProgress] = useState(0);
  const sinceRef = useRef(0);
  const wasOverRef = useRef(false);
  const firedRef = useRef(false);
  // When the cursor was last over the button; a hold survives slips shorter than 250 ms.
  const lastOverRef = useRef(0);
  // Ignore the hand for a moment after the button appears, so a hand already
  // resting on it cannot skip How to Play or press through screens.
  const armedAtRef = useRef(performance.now() + armMs);

  useEffect(() => {
    let raf = 0;
    function loop() {
      const el = elRef.current;
      const gesture = gestureRef.current;
      const pt = buttonPointer(gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null);
      if (el && pt) {
        const rect = el.getBoundingClientRect();
        const px = pt.x * window.innerWidth;
        const py = pt.y * window.innerHeight;
        const now = performance.now();
        const isOver = now >= armedAtRef.current && px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
        if (isOver) lastOverRef.current = now;
        if (!isOver && wasOverRef.current && now - lastOverRef.current <= 250) {
          // brief slip: keep the hold going
        } else if (isOver) {
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
        if (isOver || now - lastOverRef.current > 250) wasOverRef.current = isOver;
      } else if (!(wasOverRef.current && performance.now() - lastOverRef.current <= 250)) {
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
