import { useEffect, useRef, useState } from 'react';

/**
 * Tracks how long `isHovering` has been continuously true, animated at 60fps
 * independent of the (slower, noisier) hand-tracking frame rate.
 * Calls `onComplete` exactly once per continuous hover streak when progress reaches 1.
 */
export function useDwellProgress(isHovering: boolean, dwellMs: number, onComplete: () => void): number {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isHovering) {
      startRef.current = null;
      firedRef.current = false;
      setProgress(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      if (startRef.current === null) startRef.current = performance.now();
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / dwellMs);
      setProgress(p);
      if (p >= 1 && !firedRef.current) {
        firedRef.current = true;
        onCompleteRef.current();
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isHovering, dwellMs]);

  return progress;
}
