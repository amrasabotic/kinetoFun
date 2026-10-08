import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useHandTracking } from "@/hooks/useHandTracking";

// The game runs on TVs with no mouse: the index fingertip moves this pointer
// and holding it over any link or button presses it.
const DWELL_MS = 1000;
// Pressing is ignored for a moment after each screen appears, so a finger
// already resting where a new button shows up does not press it.
const ARM_MS = 1500;
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function HandPointer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state: hand, error } = useHandTracking();
  const ringRef = useRef<SVGCircleElement>(null);
  const armedAt = useRef(performance.now() + ARM_MS);
  const target = useRef<HTMLElement | null>(null);
  const since = useRef(0);

  useEffect(() => {
    armedAt.current = performance.now() + ARM_MS;
  }, [pathname]);

  useEffect(() => {
    const rearm = () => {
      armedAt.current = performance.now() + ARM_MS;
    };
    window.addEventListener("hand-pointer:rearm", rearm);
    return () => window.removeEventListener("hand-pointer:rearm", rearm);
  }, []);

  // While a puzzle is being solved the pinch selects letters, so the game
  // draws its own cursor and this pointer stands aside.
  const off = typeof document !== "undefined" && document.body.dataset.handPointer === "off";
  const active = hand.visible && !off;

  useEffect(() => {
    const ring = ringRef.current;
    const now = performance.now();
    let hit: HTMLElement | null = null;
    if (active && !hand.pinching && now >= armedAt.current) {
      hit = document.elementFromPoint(hand.x, hand.y)?.closest("a, button") ?? null;
    }
    if (hit !== target.current) {
      target.current = hit;
      since.current = now;
    }
    const pct = hit ? Math.min((now - since.current) / DWELL_MS, 1) : 0;
    if (ring) ring.style.strokeDasharray = `${pct * RING_C} ${RING_C}`;
    if (hit && pct >= 1) {
      target.current = null;
      armedAt.current = now + ARM_MS;
      hit.click();
    }
  });

  return (
    <>
      {active && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[100]"
          style={{ transform: `translate(${hand.x - 32}px, ${hand.y - 32}px)` }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="9"
              fill="currentColor"
              className="text-primary"
              stroke="white"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r={RING_R}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="5"
            />
            <circle
              ref={ringRef}
              cx="32"
              cy="32"
              r={RING_R}
              fill="none"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="5"
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ strokeDasharray: `0 ${RING_C}` }}
            />
          </svg>
        </div>
      )}
      {error && (
        <div className="fixed bottom-3 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-2 text-sm shadow">
          📷 {error}. Allow camera access and reload.
        </div>
      )}
    </>
  );
}
