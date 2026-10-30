import { useEffect, useRef } from 'react';
import { useGestureRef } from './useGesture';

interface UseActionGesturesOptions {
  onUndo: () => void;
  onHint: () => void;
  enabled: boolean;
}

// A hand opening out of a pinch passes through a thumbs-up shape, which undid pours the instant it appeared.
// So undo and hint need the pose held, and are ignored right after a pinch. Pause is an on-screen button.
const HOLD_MS = 600;
const AFTER_PINCH_MS = 800;

export function useActionGestures({ onUndo, onHint, enabled }: UseActionGesturesOptions) {
  const gestureRef = useGestureRef();
  const thumbsSinceRef = useRef<number | null>(null);
  const victorySinceRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const lastPinchRef = useRef(-Infinity);

  useEffect(() => {
    let raf = 0;
    function loop() {
      if (!enabled) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const g = gestureRef.current;
      const now = performance.now();
      if (g.isPinching) lastPinchRef.current = now;
      const calm = now - lastPinchRef.current > AFTER_PINCH_MS;

      const thumbs = calm && g.isThumbsUp;
      const victory = calm && g.isVictorySign;
      thumbsSinceRef.current = thumbs ? (thumbsSinceRef.current ?? now) : null;
      victorySinceRef.current = victory ? (victorySinceRef.current ?? now) : null;

      // One hold, one action: the pose must drop before it can fire again.
      if (!thumbs && !victory) firedRef.current = false;
      else if (!firedRef.current) {
        if (thumbsSinceRef.current !== null && now - thumbsSinceRef.current >= HOLD_MS) { firedRef.current = true; onUndo(); }
        else if (victorySinceRef.current !== null && now - victorySinceRef.current >= HOLD_MS) { firedRef.current = true; onHint(); }
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, onUndo, onHint, gestureRef]);
}
