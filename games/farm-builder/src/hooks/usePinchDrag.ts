import { useEffect, useRef, useState } from 'react';
import { useGesture } from '../mediaPipe/GestureProvider';

export interface DragPayload {
  kind: 'seed' | 'crop';
  cropId: string;
  plotIndex?: number; // set when kind === 'crop' — which plot the ripe crop is being lifted from
  emoji: string;
}

interface RectEntry<T> {
  id: string;
  rect: DOMRect;
  data: T;
}

interface UsePinchDragOptions {
  /** Computed lazily, only at the moment a pinch begins. */
  getGrabbables: () => RectEntry<DragPayload>[];
  /** Computed lazily, only at the moment a pinch ends. */
  getDropzones: () => RectEntry<null>[];
  onDrop: (payload: DragPayload, dropZoneId: string) => void;
  onCancel?: (payload: DragPayload) => void;
}

function hitTest<T>(entries: RectEntry<T>[], px: number, py: number): RectEntry<T> | undefined {
  return entries.find((e) => px >= e.rect.left && px <= e.rect.right && py >= e.rect.top && py <= e.rect.bottom);
}

// isPinching (like isFist/isPalmOpen) is computed fresh per-frame with no smoothing, so a raw
// pinch can flicker for a frame or two on landmark jitter. Require it to sustain for this long
// before treating it as a real grab — same fix gesture-love-balls uses for its pinch-to-draw
// mechanic (PINCH_CONFIRM_MS). Release stays instant so letting go feels responsive.
const PINCH_CONFIRM_MS = 100;

export function usePinchDrag({ getGrabbables, getDropzones, onDrop, onCancel }: UsePinchDragOptions) {
  const { frame } = useGesture();
  const [held, setHeld] = useState<DragPayload | null>(null);
  const wasConfirmedPinching = useRef(false);
  const pinchStartRef = useRef<number | null>(null);

  useEffect(() => {
    const rawPinching = frame.detected && frame.isPinching;
    if (rawPinching && pinchStartRef.current === null) pinchStartRef.current = performance.now();
    if (!rawPinching) pinchStartRef.current = null;
    const confirmedPinching = rawPinching && pinchStartRef.current !== null
      && performance.now() - pinchStartRef.current >= PINCH_CONFIRM_MS;

    const px = frame.cursorX * window.innerWidth;
    const py = frame.cursorY * window.innerHeight;

    if (confirmedPinching && !wasConfirmedPinching.current) {
      const hit = hitTest(getGrabbables(), px, py);
      if (hit) setHeld(hit.data);
    } else if (!rawPinching && wasConfirmedPinching.current) {
      setHeld((current) => {
        if (!current) return null;
        const hit = hitTest(getDropzones(), px, py);
        if (hit) onDrop(current, hit.id);
        else onCancel?.(current);
        return null;
      });
    }
    wasConfirmedPinching.current = confirmedPinching;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.cursorX, frame.cursorY, frame.isPinching, frame.detected]);

  const cursorPx = { x: frame.cursorX * window.innerWidth, y: frame.cursorY * window.innerHeight };
  return { held, cursorPx, isPinching: frame.detected && frame.isPinching };
}
