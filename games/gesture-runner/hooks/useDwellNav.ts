'use client';

import { useEffect, useRef, useState } from 'react';
import type { HandPosition } from '../types/gestures';
import { DWELL_TIME } from '../utils/constants';

// On the platform the bridge supplies one cursor for every game, drawn by the platform itself; menu buttons follow it.
type SharedCursor = { x: number; y: number; visible: boolean };
const kfWin = (typeof window !== "undefined" ? window : {}) as { __kfCursor?: SharedCursor; __kfMenu?: (on: boolean) => void };
export const kfShared = kfWin.__kfCursor;
let kfMenuOn: boolean | null = null;
let kfActive = 0;
function kfMenu(on: boolean) {
  if (!kfShared || on === kfMenuOn) return;
  kfMenuOn = on;
  kfWin.__kfMenu?.(on);
}

interface DwellButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseDwellNavOptions {
  buttons: DwellButton[];
  handPositions: HandPosition[];
  onActivate: (id: string) => void;
  dwellTime?: number;
  enabled: boolean;
}

export function useDwellNav(options: UseDwellNavOptions): {
  hoveredId: string | null;
  dwellProgress: number;
} {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const activatedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!options.enabled) {
      setHoveredId(null);
      setDwellProgress(0);
      return;
    }

    const dwell = options.dwellTime ?? DWELL_TIME;
    // Buttons are on screen while any dwell hook is enabled, so the platform shows its cursor.
    kfActive++;
    kfMenu(true);

    function tick() {
      const opts = optionsRef.current;
      const hand = kfShared
        ? (kfShared.visible ? { x: kfShared.x, y: kfShared.y } : null)
        : opts.handPositions.find((h) => h.visible) ?? null;

      let currentHovered: string | null = null;

      if (hand && typeof window !== 'undefined') {
        const hx = hand.x * window.innerWidth;
        const hy = hand.y * window.innerHeight;

        for (const btn of opts.buttons) {
          if (hx >= btn.x && hx <= btn.x + btn.w && hy >= btn.y && hy <= btn.y + btn.h) {
            currentHovered = btn.id;
            break;
          }
        }
      }

      setHoveredId((prev) => {
        if (prev !== currentHovered) {
          dwellStart.current = currentHovered ? Date.now() : null;
          activatedRef.current.delete(currentHovered ?? '');
        }
        return currentHovered;
      });

      if (currentHovered && dwellStart.current !== null) {
        const elapsed = Date.now() - dwellStart.current;
        const progress = Math.min(1, elapsed / dwell);
        setDwellProgress(progress);

        if (progress >= 1 && !activatedRef.current.has(currentHovered)) {
          activatedRef.current.add(currentHovered);
          opts.onActivate(currentHovered);
          dwellStart.current = null;
          setDwellProgress(0);
        }
      } else {
        setDwellProgress(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      kfActive--;
      if (kfActive === 0) kfMenu(false);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [options.enabled, options.dwellTime]);

  return { hoveredId, dwellProgress };
}
