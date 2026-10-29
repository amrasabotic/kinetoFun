import { useEffect, useRef } from 'react';
import { useGestureRef } from './useGesture';

interface UseActionGesturesOptions {
  onUndo: () => void;
  onHint: () => void;
  enabled: boolean;
}

/**
 * The three non-tube gestures, each edge-triggered or held so they can
 * never fire from a single noisy frame: thumbs-up fires undo the instant it
 * appears (it's already a deliberate, distinctive pose — no hold needed on
 * top of it), and a victory sign fires a hint the same way. Pause is an
 * on-screen button: an open-palm pause fired while players rested a hand on a tube.
 */
export function useActionGestures({ onUndo, onHint, enabled }: UseActionGesturesOptions) {
  const gestureRef = useGestureRef();
  const wasThumbsUpRef = useRef(false);
  const wasVictoryRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    function loop() {
      if (!enabled) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const g = gestureRef.current;

      if (g.isThumbsUp && !wasThumbsUpRef.current) onUndo();
      wasThumbsUpRef.current = g.isThumbsUp;

      if (g.isVictorySign && !wasVictoryRef.current) onHint();
      wasVictoryRef.current = g.isVictorySign;

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, onUndo, onHint, gestureRef]);
}
