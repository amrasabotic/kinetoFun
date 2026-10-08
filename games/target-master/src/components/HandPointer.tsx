import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ensureHandInput, latestHand } from "@/lib/handInput";
import { HandSmoother } from "@/lib/handTracker";

// The game runs on TVs with no mouse: an open hand moves this pointer and
// holding it over any link or button presses it.
const DWELL_MS = 1000;
// Pressing is ignored for a moment after each screen appears, so a hand that
// is already resting where a new button shows up does not press it.
const ARM_MS = 1500;
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function HandPointer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pointerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const armedAt = useRef(performance.now() + ARM_MS);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    ensureHandInput().catch((e) => setError(e instanceof Error ? e.message : "Camera unavailable"));

    const smoother = new HandSmoother();
    let target: HTMLElement | null = null;
    let since = 0;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = pointerRef.current;
      const ring = ringRef.current;
      if (!el || !ring) return;

      const now = performance.now();
      const { hand, lastT } = latestHand();
      // While an arrow is being aimed the game draws its own cursor.
      const off = document.body.dataset.handPointer === "off";
      if (off || !hand || now - lastT > 400) {
        el.style.opacity = "0";
        target = null;
        ring.style.strokeDasharray = `0 ${RING_C}`;
        return;
      }

      const p = now - lastT < 120 ? smoother.update(hand.x, hand.y, now) : smoother.predict(now);
      const x = p.x * window.innerWidth;
      const y = p.y * window.innerHeight;
      el.style.opacity = "1";
      el.style.transform = `translate(${x}px, ${y}px)`;

      const hit =
        hand.closed || now < armedAt.current
          ? null
          : (document.elementFromPoint(x, y)?.closest("a, button") as HTMLElement | null);
      if (hit !== target) {
        target = hit;
        since = now;
      }
      const pct = target ? Math.min((now - since) / DWELL_MS, 1) : 0;
      ring.style.strokeDasharray = `${pct * RING_C} ${RING_C}`;
      if (target && pct >= 1) {
        const pressed = target;
        target = null;
        armedAt.current = now + ARM_MS;
        pressed.click();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div
        ref={pointerRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] opacity-0"
        style={{ marginLeft: -32, marginTop: -32 }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="10"
            fill="oklch(0.95 0.2 90 / 0.9)"
            stroke="white"
            strokeWidth="3"
          />
          <circle
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
            stroke="oklch(1 0 0 / 0.25)"
            strokeWidth="5"
          />
          <circle
            ref={ringRef}
            cx="32"
            cy="32"
            r={RING_R}
            fill="none"
            stroke="oklch(0.95 0.2 90)"
            strokeWidth="5"
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{ strokeDasharray: `0 ${RING_C}` }}
          />
        </svg>
      </div>
      {error && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] panel px-4 py-2 text-sm">
          📷 {error}. Allow camera access and reload.
        </div>
      )}
    </>
  );
}
