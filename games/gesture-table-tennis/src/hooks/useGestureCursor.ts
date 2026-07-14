import { useRef, useCallback } from 'react';
import type { HandData } from '../gestures/useMediaPipe';

export interface GestureCursor {
  x: number;
  y: number;
  isHovering: boolean;
  isPinching: boolean;
}

const DWELL_TIME = 1.2; // seconds to trigger selection by hovering
const CURSOR_SMOOTH = 0.25;

/**
 * Converts hand position to a screen cursor for gesture-based UI navigation.
 * Returns cursor state and a function to check if cursor is hovering over a rect.
 */
export function useGestureCursor(W: number, H: number) {
  const cursorRef = useRef<GestureCursor>({ x: W / 2, y: H / 2, isHovering: false, isPinching: false });
  const dwellRef = useRef<Map<string, number>>(new Map());
  const prevPinch = useRef(false);

  const update = useCallback((hand: HandData) => {
    if (!hand.detected) return;
    // Mirror hand x (camera is front-facing, so left in camera = right on screen)
    const targetX = (1 - hand.palmX) * W;
    const targetY = hand.palmY * H;

    const c = cursorRef.current;
    c.x += (targetX - c.x) * CURSOR_SMOOTH;
    c.y += (targetY - c.y) * CURSOR_SMOOTH;
    c.isPinching = hand.isPinch && !prevPinch.current;
    prevPinch.current = hand.isPinch;
    c.isHovering = hand.isOpen;
  }, [W, H]);

  const checkHover = useCallback((id: string, rect: DOMRect | { x: number; y: number; w: number; h: number }, dt: number): { hover: boolean; select: boolean; dwellProgress: number } => {
    const c = cursorRef.current;
    const r = 'width' in rect
      ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
      : rect as { x: number; y: number; w: number; h: number };

    const inside = c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h;

    if (inside) {
      const prev = dwellRef.current.get(id) ?? 0;
      const next = prev + dt;
      dwellRef.current.set(id, next);
      const progress = Math.min(1, next / DWELL_TIME);
      const select = next >= DWELL_TIME || c.isPinching;
      if (select) dwellRef.current.set(id, 0);
      return { hover: true, select, dwellProgress: progress };
    } else {
      dwellRef.current.set(id, 0);
      return { hover: false, select: false, dwellProgress: 0 };
    }
  }, []);

  const resetDwell = useCallback((id?: string) => {
    if (id) dwellRef.current.set(id, 0);
    else dwellRef.current.clear();
  }, []);

  return { cursorRef, update, checkHover, resetDwell };
}
