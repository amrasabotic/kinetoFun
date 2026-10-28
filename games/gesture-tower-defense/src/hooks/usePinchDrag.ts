import { useEffect, useRef, useState } from 'react';
import { useGesture } from '../mediaPipe/GestureProvider';
import type { TowerTypeId } from '../types';

export interface DragPayload {
  source: 'tray' | 'placed';
  typeId: TowerTypeId;
  placedTowerId?: string; // set only when source === 'placed'
}

interface RectEntry<T> {
  id: string;
  rect: DOMRect;
  data: T;
}

interface UsePinchDragOptions {
  getGrabbables: () => RectEntry<DragPayload>[];
  getDropzones: () => RectEntry<null>[];
  onDrop: (payload: DragPayload, dropZoneId: string) => void;
  onCancel?: (payload: DragPayload) => void;
}

function hitTest<T>(entries: RectEntry<T>[], px: number, py: number): RectEntry<T> | undefined {
  return entries.find((e) => px >= e.rect.left && px <= e.rect.right && py >= e.rect.top && py <= e.rect.bottom);
}

// A raw pinch can flicker for a frame on landmark jitter, so it must last this long to count as a grab.
const PINCH_CONFIRM_MS = 100;
// From a sofa a pinch is easily lost halfway across the screen, so a picked-up tower stays in the hand
// until it is put down: resting on a target this long picks up, drops, or (back on the tray) cancels.
const REST_MS = 800;

export function usePinchDrag({ getGrabbables, getDropzones, onDrop, onCancel }: UsePinchDragOptions) {
  const { frame } = useGesture();
  const [held, setHeld] = useState<DragPayload | null>(null);
  const [progress, setProgress] = useState(0);
  const heldRef = useRef<DragPayload | null>(null);
  const pinchStartRef = useRef<number | null>(null);
  const wasPinching = useRef(false);
  const rest = useRef<{ id: string; since: number } | null>(null);
  // After a pick or drop the hand must leave that spot before anything there counts again.
  const doneOn = useRef<DOMRect | null>(null);

  function setHolding(p: DragPayload | null) {
    heldRef.current = p;
    setHeld(p);
  }

  useEffect(() => {
    const px = frame.cursorX * window.innerWidth;
    const py = frame.cursorY * window.innerHeight;
    const now = performance.now();

    const rawPinching = frame.detected && frame.isPinching;
    if (rawPinching && pinchStartRef.current === null) pinchStartRef.current = now;
    if (!rawPinching) pinchStartRef.current = null;
    const pinching = rawPinching && pinchStartRef.current !== null && now - pinchStartRef.current >= PINCH_CONFIRM_MS;
    const pinchStarted = pinching && !wasPinching.current;
    wasPinching.current = pinching;

    if (!frame.detected) { rest.current = null; setProgress(0); return; }
    const d = doneOn.current;
    if (d && !(px >= d.left && px <= d.right && py >= d.top && py <= d.bottom)) doneOn.current = null;
    if (doneOn.current && !pinchStarted) { rest.current = null; setProgress(0); return; }

    const current = heldRef.current;
    let target: { id: string; rect: DOMRect; act: () => void } | null = null;
    if (!current) {
      const hit = hitTest(getGrabbables(), px, py);
      if (hit) {
        if (pinchStarted) { setHolding(hit.data); doneOn.current = hit.rect; rest.current = null; setProgress(0); return; }
        target = { id: hit.id, rect: hit.rect, act: () => setHolding(hit.data) };
      }
    } else {
      const drop = hitTest(getDropzones(), px, py);
      const back = hitTest(getGrabbables(), px, py);
      const same = back && (current.source === 'tray'
        ? back.data.source === 'tray' && back.data.typeId === current.typeId
        : back.data.placedTowerId === current.placedTowerId);
      if (drop) target = { id: drop.id, rect: drop.rect, act: () => { setHolding(null); onDrop(current, drop.id); } };
      else if (back && same) {
        target = { id: back.id, rect: back.rect, act: () => { setHolding(null); onCancel?.(current); } };
      }
    }

    if (!target) {
      rest.current = null;
      setProgress(0);
      return;
    }
    if (rest.current?.id !== target.id) rest.current = { id: target.id, since: now };
    const p = Math.min(1, (now - rest.current.since) / REST_MS);
    setProgress(p);
    if (p >= 1) {
      doneOn.current = target.rect;
      rest.current = null;
      setProgress(0);
      target.act();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.cursorX, frame.cursorY, frame.isPinching, frame.detected]);

  const cursorPx = { x: frame.cursorX * window.innerWidth, y: frame.cursorY * window.innerHeight };
  return { held, progress, cursorPx, isPinching: frame.detected && frame.isPinching };
}
