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

// The camera loses a hand at its edges, so the middle of its view is stretched over the whole screen.
const reach = (v: number, lo: number, hi: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));

// On the platform the bridge supplies one cursor for every game, drawn by the platform itself.
type SharedCursor = { x: number; y: number; visible: boolean };
export const kf = (typeof window !== 'undefined' ? window : {}) as { __kfCursor?: SharedCursor; __kfMenu?: (on: boolean) => void };
export const usesSharedCursor = !!kf.__kfCursor;

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
    let reported = false;
    // Lets the platform's Back button follow this cursor.
    const platform = window as unknown as { __kfPointer?: (x: number | null, y?: number) => void };
    function tick() {
      const hand = handRef.current;
      const tip = hand?.landmarks?.[8];
      const shared = kf.__kfCursor;
      if (shared) {
        cursorRef.current = { xPct: shared.x * 100, yPct: shared.y * 100, detected: shared.visible, pinch: !!hand?.isPinch };
      } else if (hand?.detected && tip) {
        const rawX = reach(1 - tip.x, 0.12, 0.88);
        const rawY = reach(tip.y, 0.1, 0.75);
        // Light smoothing only: heavier smoothing made the cursor trail behind the hand.
        smooth.current.x += (rawX - smooth.current.x) * 0.5;
        smooth.current.y += (rawY - smooth.current.y) * 0.5;
        cursorRef.current = { xPct: smooth.current.x, yPct: smooth.current.y, detected: true, pinch: hand.isPinch };
        platform.__kfPointer?.(smooth.current.x / 100, smooth.current.y / 100);
        reported = true;
      } else {
        cursorRef.current = { ...cursorRef.current, detected: false, pinch: false };
        if (reported) { platform.__kfPointer?.(null); reported = false; }
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
