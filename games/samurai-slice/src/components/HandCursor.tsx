import { useEffect, useRef } from 'react';

/** Hand position in screen space, 0..1 on each axis, already mirrored. */
export type HandPoint = { x: number; y: number } | null;

/**
 * Lets the hand operate every menu button: the palm moves an on-screen
 * cursor, and holding it over a button presses it. The game runs on TVs with
 * no mouse, so this is the only way to use the menus.
 *
 * It works on any enabled <button> in the page, so screens need no wiring of
 * their own. The cursor is hidden while no button is on screen, which keeps
 * it out of the way during play.
 */

const DWELL_MS = 900;
// Ignore the hand briefly on start-up and after each press, so a hand that is
// already raised cannot skip a screen or press the button that appears in
// the same place on the next one.
const ARM_MS = 1500;
const COOLDOWN_MS = 1000;
const SMOOTHING = 0.3;
// Holding the cursor near the top or bottom edge scrolls long screens.
const SCROLL_EDGE = 0.12;
const SCROLL_SPEED = 9;

export default function HandCursor({ getPoint, enabled = true }: {
  getPoint: () => HandPoint;
  enabled?: boolean;
}) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const getPointRef = useRef(getPoint);
  const enabledRef = useRef(enabled);
  getPointRef.current = getPoint;
  enabledRef.current = enabled;

  useEffect(() => {
    let raf = 0;
    let x = 0.5;
    let y = 0.5;
    let target: HTMLButtonElement | null = null;
    let since = 0;
    let blockedUntil = performance.now() + ARM_MS;
    let lastPressed: HTMLButtonElement | null = null;
    let wasEnabled = enabledRef.current;

    const circumference = 2 * Math.PI * 22;

    function setRing(p: number) {
      ringRef.current?.setAttribute('stroke-dashoffset', String(circumference * (1 - p)));
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const cursor = cursorRef.current;
      const on = enabledRef.current;
      // Re-arm whenever the cursor comes back, e.g. when a game-over screen opens.
      if (on && !wasEnabled) blockedUntil = performance.now() + ARM_MS;
      wasEnabled = on;
      const hand = on ? getPointRef.current() : null;
      if (!cursor) return;

      const hasButtons = document.querySelector('button:not([disabled])') !== null;
      if (!hand || !hasButtons) {
        cursor.style.opacity = '0';
        target = null;
        setRing(0);
        return;
      }

      x += (hand.x - x) * SMOOTHING;
      y += (hand.y - y) * SMOOTHING;
      const px = x * window.innerWidth;
      const py = y * window.innerHeight;
      cursor.style.opacity = '1';
      cursor.style.transform = `translate(${px - 26}px, ${py - 26}px)`;

      const under = document.elementFromPoint(px, py);
      scrollNear(under, y);

      const button = under?.closest('button:not([disabled])') as HTMLButtonElement | null;
      if (button !== lastPressed) lastPressed = null;

      const now = performance.now();
      if (!button || button === lastPressed || now < blockedUntil) {
        target = null;
        setRing(0);
        return;
      }
      if (button !== target) {
        target = button;
        since = now;
      }
      const progress = Math.min((now - since) / DWELL_MS, 1);
      setRing(progress);
      if (progress >= 1) {
        button.click();
        lastPressed = button;
        target = null;
        blockedUntil = now + COOLDOWN_MS;
        setRing(0);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-[100] h-[52px] w-[52px] opacity-0 transition-opacity"
      aria-hidden
    >
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="9" fill="rgba(255,255,255,0.9)" stroke="#7C3AED" strokeWidth="3" />
        <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
        <circle
          ref={ringRef}
          cx="26" cy="26" r="22" fill="none" stroke="#5EED7A" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={String(2 * Math.PI * 22)} strokeDashoffset={String(2 * Math.PI * 22)}
          transform="rotate(-90 26 26)"
        />
      </svg>
    </div>
  );
}

function scrollNear(el: Element | null, y: number) {
  const dir = y > 1 - SCROLL_EDGE ? 1 : y < SCROLL_EDGE ? -1 : 0;
  if (!dir) return;
  for (let node = el; node; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        node.scrollTop += dir * SCROLL_SPEED;
        return;
      }
    }
  }
}
