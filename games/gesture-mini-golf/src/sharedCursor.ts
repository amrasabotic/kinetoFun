import { useEffect } from 'react';

// On the platform the bridge supplies one cursor for every game, drawn by the platform itself.
type SharedCursor = { x: number; y: number; visible: boolean };
const kf = (typeof window !== 'undefined' ? window : {}) as { __kfCursor?: SharedCursor; __kfMenu?: (on: boolean) => void };
export const usesSharedCursor = !!kf.__kfCursor;

let menuOn = false;

// Menu buttons follow the platform cursor; during play the game's own aim cursor stays.
export function useMenuCursor(on: boolean): void {
  useEffect(() => {
    menuOn = on;
    kf.__kfMenu?.(on);
  }, [on]);
}

export function buttonPointer(own: { x: number; y: number } | null): { x: number; y: number } | null {
  const s = kf.__kfCursor;
  if (!menuOn || !s) return own;
  return s.visible ? { x: s.x, y: s.y } : null;
}
