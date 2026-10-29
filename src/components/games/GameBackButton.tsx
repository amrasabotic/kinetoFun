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
/** A game that draws no cursor of its own gets a ring this close to the button, so the player can see where the hand points. */
const RING_NEAR_PX = 320;

/**
 * "Back to games", top left, the same look on every game. Works with a click, and
 * with the hand: games report the fingertip (see public/kf-bridge.js) and holding it
 * over this button fills it.
 */
export function GameBackButton({ onLeave, large }: { onLeave: () => void; large?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);
  const leaveRef = useRef(onLeave);
  useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    const armedAt = performance.now() + ARM_MS;
    let heldSince: number | null = null;
    let lastReport = 0;
    let point: { x: number; y: number } | null = null;
    let ring = false;
    let fired = false;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const d = event.data as { type?: string; x?: number; y?: number; visible?: boolean };
      if (d?.type !== "KF_HAND") return;
      lastReport = performance.now();
      ring = !!(d as { ring?: boolean }).ring;
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
      const near =
        !!r && !!point && ring && now - lastReport < STALE_MS &&
        point.x <= r.right + RING_NEAR_PX && point.y <= r.bottom + RING_NEAR_PX;
      setRing((prev) => (near && point ? (prev?.x === point.x && prev?.y === point.y ? prev : { ...point }) : null));
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
        className="pointer-events-none fixed z-30 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-white/25 shadow-[0_0_12px_rgba(0,0,0,0.6)]"
        style={{ left: ring.x, top: ring.y }}
      />
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
