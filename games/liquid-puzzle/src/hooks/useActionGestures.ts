import { useEffect, useRef } from 'react';
import { useGestureRef } from './useGesture';

const PAUSE_HOLD_MS = 2000;

interface UseActionGesturesOptions {
  onUndo: () => void;
  onHint: () => void;
  onPause: () => void;
  enabled: boolean;
}

/**
 * The three non-tube gestures, each edge-triggered or held so they can
 * never fire from a single noisy frame: thumbs-up fires undo the instant it
 * appears (it's already a deliberate, distinctive pose — no hold needed on
 * top of it), a victory sign fires a hint the same way, and an open palm
 * held continuously for a full 2 seconds anywhere on screen opens the pause
 * menu. None of these compete with tube grabbing, which requires a pinch.
 */
export function useActionGestures({ onUndo, onHint, onPause, enabled }: UseActionGesturesOptions) {
  const gestureRef = useGestureRef();
  const wasThumbsUpRef = useRef(false);
  const wasVictoryRef = useRef(false);
  const palmSinceRef = useRef(0);
  const pauseFiredRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    function loop() {
      if (!enabled) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const g = gestureRef.current;
      const now = performance.now();

      if (g.isThumbsUp && !wasThumbsUpRef.current) onUndo();
      wasThumbsUpRef.current = g.isThumbsUp;

      if (g.isVictorySign && !wasVictoryRef.current) onHint();
      wasVictoryRef.current = g.isVictorySign;

      if (g.isPalmOpen) {
        if (palmSinceRef.current === 0) {
          palmSinceRef.current = now;
          pauseFiredRef.current = false;
        }
        const held = now - palmSinceRef.current;
        if (held >= PAUSE_HOLD_MS && !pauseFiredRef.current) {
          pauseFiredRef.current = true;
          onPause();
        }
      } else {
        palmSinceRef.current = 0;
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, onUndo, onHint, onPause, gestureRef]);
}
