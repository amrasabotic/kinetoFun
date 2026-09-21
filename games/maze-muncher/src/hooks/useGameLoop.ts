import { useEffect, useRef } from 'react';

/**
 * Drives `callback(dt, now)` every animation frame while `active` is true.
 * `dt` is clamped so a dropped/backgrounded tab can't cause a giant physics
 * step ("spiral of death") when it regains focus.
 */
export function useGameLoop(callback: (dt: number, now: number) => void, active: boolean): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const rafRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastRef.current = null;
      return;
    }

    function tick(now: number) {
      if (lastRef.current === null) lastRef.current = now;
      const dt = Math.min((now - lastRef.current) / 1000, 1 / 20);
      lastRef.current = now;
      cbRef.current(dt, now);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
}
