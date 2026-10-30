import React, { useEffect, useRef } from 'react';
import { HandPosition } from '../types/game';

// On the platform the bridge supplies one cursor for every game, drawn by the platform itself; menu buttons follow it.
type SharedCursor = { x: number; y: number; visible: boolean };
const kfWin = window as unknown as { __kfCursor?: SharedCursor; __kfMenu?: (on: boolean) => void };
const kfShared = kfWin.__kfCursor;
let kfMenuOn: boolean | null = null;
function kfMenu(on: boolean) {
  if (!kfShared || on === kfMenuOn) return;
  kfMenuOn = on;
  kfWin.__kfMenu?.(on);
}

/*
 * The game is played on TVs with no mouse, so menus are hand-controlled:
 * a cursor follows the index fingertip, and any element marked `data-dwell`
 * is pressed by holding the cursor on it until the ring around the cursor
 * closes. `data-dwell="1500"` sets a custom hold time in ms.
 */

const DWELL_MS = 900;
// Buttons ignore the hand for a moment after they appear, so a hand already
// resting where a button is drawn cannot press it by accident.
const ARM_MS = 1500;
// A hold survives the hand slipping off, or one missed tracking frame, for this long.
const GRACE_MS = 250;
const RING_R = 20;
const RING_LEN = 2 * Math.PI * RING_R;

interface HandCursorProps {
  getPosition: () => HandPosition;
  /** Hidden during play, where the shield is the pointer. */
  visible: boolean;
}

export const HandCursor: React.FC<HandCursorProps> = ({ getPosition, visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    let raf = 0;
    let target: Element | null = null;
    let start = 0;
    let lastOnTarget = 0;
    let armedAt = performance.now() + ARM_MS;

    // Re-arm whenever new pressable elements appear (a new screen or overlay).
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (n instanceof Element && (n.matches('[data-dwell]') || n.querySelector('[data-dwell]'))) {
            armedAt = performance.now() + ARM_MS;
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const setProgress = (p: number) => {
      ringRef.current?.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - p)));
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const root = rootRef.current;
      if (!root) return;
      kfMenu(visibleRef.current);
      const pos = kfShared ? { detected: kfShared.visible, x: kfShared.x, y: kfShared.y } : getPosition();
      if (!pos.detected && visibleRef.current && target && performance.now() - lastOnTarget <= GRACE_MS) return;
      if (!pos.detected || !visibleRef.current) {
        root.style.opacity = '0';
        target = null;
        setProgress(0);
        return;
      }
      const x = pos.x * window.innerWidth;
      const y = pos.y * window.innerHeight;
      root.style.opacity = '1';
      root.style.transform = `translate(${x}px, ${y}px)`;

      const now = performance.now();
      const hit = document.elementFromPoint(x, y)?.closest('[data-dwell]') ?? null;
      if (hit === target) {
        lastOnTarget = now;
      } else if (target && now - lastOnTarget <= GRACE_MS) {
        return;
      } else {
        target = hit;
        start = now;
        lastOnTarget = now;
      }
      if (!target || now < armedAt || (target as HTMLButtonElement).disabled) {
        start = now;
        setProgress(0);
        return;
      }
      const ms = Number((target as HTMLElement).dataset.dwell) || DWELL_MS;
      const p = Math.min(1, (now - start) / ms);
      setProgress(p);
      if (p >= 1) {
        const pressed = target;
        target = null;
        armedAt = now + ARM_MS;
        setProgress(0);
        // dispatchEvent rather than click(): level-map nodes are SVG elements.
        pressed.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [getPosition]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-6 -mt-6 h-12 w-12 transition-opacity"
      style={{ opacity: 0 }}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        {/* With the platform cursor only the press progress is drawn here. */}
        {!kfShared && <circle cx="24" cy="24" r={RING_R} fill="rgba(74,222,128,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />}
        <circle
          ref={ringRef}
          cx="24"
          cy="24"
          r={RING_R}
          fill="none"
          stroke="#4ade80"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_LEN}
          strokeDashoffset={RING_LEN}
        />
        <circle cx="24" cy="24" r="4" fill="#4ade80" />
      </svg>
    </div>
  );
};
