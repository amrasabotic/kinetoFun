import { createContext, useContext, useEffect, useRef } from 'react';
import type { HandData } from './useMediaPipe';

export interface CursorPoint {
  xPct: number;
  yPct: number;
  detected: boolean;
  pinch: boolean;
}

export const EMPTY_CURSOR: CursorPoint = { xPct: 50, yPct: 50, detected: false, pinch: false };
const EMPTY = EMPTY_CURSOR;

const CursorRefContext = createContext<React.RefObject<CursorPoint> | null>(null);

/**
 * Tracks the index fingertip (landmark 8) as a screen-space cursor (percent
 * coordinates) for menu navigation — a separate gesture vocabulary from the
 * wrist/fist/palm controls used during gameplay. Exposes a ref (not React
 * state) so consumers can poll it in their own rAF loops without forcing
 * this provider's whole subtree to re-render 60x/sec.
 */
export function MenuCursorProvider({
  handRef,
  children,
}: {
  handRef: React.RefObject<HandData>;
  children: React.ReactNode;
}) {
  const cursorRef = useRef<CursorPoint>({ ...EMPTY });
  const smooth = useRef({ x: 50, y: 50 });

  useEffect(() => {
    let raf = 0;
    function tick() {
      const hand = handRef.current;
      const tip = hand?.landmarks?.[8];
      if (hand?.detected && tip) {
        const rawX = (1 - tip.x) * 100;
        const rawY = tip.y * 100;
        smooth.current.x += (rawX - smooth.current.x) * 0.25;
        smooth.current.y += (rawY - smooth.current.y) * 0.25;
        cursorRef.current = { xPct: smooth.current.x, yPct: smooth.current.y, detected: true, pinch: hand.isPinch };
      } else {
        cursorRef.current = { ...cursorRef.current, detected: false, pinch: false };
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [handRef]);

  return <CursorRefContext.Provider value={cursorRef}>{children}</CursorRefContext.Provider>;
}

export function useMenuCursorRef(): React.RefObject<CursorPoint> {
  const ctx = useContext(CursorRefContext);
  if (!ctx) throw new Error('useMenuCursorRef must be used within MenuCursorProvider');
  return ctx;
}
