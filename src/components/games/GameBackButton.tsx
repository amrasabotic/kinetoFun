"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** Hand held over the button this long presses it (long, so a sweeping hand cannot trigger it). The hand must leave the button before it can press again. */
const HOLD_MS = 2000;
/** The hand is ignored for a moment after the round starts. */
const ARM_MS = 1500;
/** No hand report for this long means the hand has left the camera. */
const STALE_MS = 400;
/** The button counts as touched a little beyond its edge, because a hand is never exact. */
const REACH_PX = 24;
/** The button lights up when the hand comes this close. */
const NEAR_PX = 220;
/** Games that report no cursor of their own (many hide it during play) get a platform ring this close to the button. Games that report one never do, so it is never a second cursor there. */
const RING_NEAR_PX = 320;

/**
 * "Back to games", top left, the same look on every game. Works with a click, and
 * with the hand: games report the fingertip (see public/kf-bridge.js) and holding it
 * over this button fills it.
 */
export function GameBackButton({ onLeave, large }: { onLeave: () => void; large?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [near, setNear] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number; cursor: boolean } | null>(null);
  const leaveRef = useRef(onLeave);
  useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    const armedAt = performance.now() + ARM_MS;
    let heldSince: number | null = null;
    let lastReport = 0;
    let point: { x: number; y: number } | null = null;
    let unreported = false;
    let cursorMode = false;
    let drawn: { x: number; y: number } | null = null;
    let fired = false;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const d = event.data as { type?: string; x?: number; y?: number; visible?: boolean };
      if (d?.type !== "KF_HAND") return;
      lastReport = performance.now();
      unreported = !!(d as { ring?: boolean }).ring;
      cursorMode = !!(d as { cursor?: boolean }).cursor;
      point = d.visible && typeof d.x === "number" && typeof d.y === "number"
        ? { x: d.x * window.innerWidth, y: d.y * window.innerHeight }
        : null;
    };

    const tick = () => {
      const now = performance.now();
      const r = ref.current?.getBoundingClientRect();
      const over =
        !!r && !!point && now - lastReport < STALE_MS && now >= armedAt &&
        point.x >= r.left - REACH_PX && point.x <= r.right + REACH_PX &&
        point.y >= r.top - REACH_PX && point.y <= r.bottom + REACH_PX;
      setNear(
        !!r && !!point && now - lastReport < STALE_MS &&
        point.x <= r.right + NEAR_PX && point.y <= r.bottom + NEAR_PX,
      );
      // A game on the shared cursor (kf-bridge __kfMenu) draws none of its own, so the platform draws it everywhere.
      const showRing =
        !!r && !!point && now - lastReport < STALE_MS &&
        (cursorMode || (unreported && point.x <= r.right + RING_NEAR_PX && point.y <= r.bottom + RING_NEAR_PX));
      if (showRing && point) {
        // Eases between reports (about 30 a second) so the cursor glides at screen rate.
        drawn = drawn ? { x: drawn.x + (point.x - drawn.x) * 0.5, y: drawn.y + (point.y - drawn.y) * 0.5 } : { ...point };
      } else drawn = null;
      const d = drawn;
      setRing((prev) => (d ? (prev?.x === d.x && prev?.y === d.y && prev.cursor === cursorMode ? prev : { ...d, cursor: cursorMode }) : null));
      if (over) {
        heldSince ??= now;
        const p = Math.min(1, (now - heldSince) / HOLD_MS);
        setProgress(p);
        if (p >= 1 && !fired) { fired = true; heldSince = null; leaveRef.current(); }
      } else {
        heldSince = null;
        fired = false;
        setProgress(0);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("message", onMessage);
    let raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("message", onMessage); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
    {ring && (
      <span
        aria-hidden
        className={cn(
          "pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-white/25 shadow-[0_0_12px_rgba(0,0,0,0.6)]",
          ring.cursor ? "h-14 w-14" : "h-10 w-10",
        )}
        style={{ left: ring.x, top: ring.y }}
      >
        {ring.cursor && <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />}
      </span>
    )}
    <button
      ref={ref}
      type="button"
      data-focusable
      onClick={onLeave}
      className={cn(
        buttonClasses("secondary", large ? "lg" : "md"),
        "relative overflow-hidden bg-black/55 text-white backdrop-blur-md",
        large && "h-16 px-8 text-2xl",
        near && "ring-4 ring-white",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-white/35"
        style={{ width: `${progress * 100}%` }}
      />
      <ArrowLeft className={cn("relative", large ? "h-7 w-7" : "h-5 w-5")} />
      <span className="relative">Back to games</span>
    </button>
    </>
  );
}
