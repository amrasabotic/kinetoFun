"use client";

import { useImperativeHandle, useRef, type Ref } from "react";

const SIZE = 84;
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface HandCursorHandle {
  /** `point` in viewport pixels, or null to hide the cursor. */
  update(point: { x: number; y: number } | null, progress: number, engaged: boolean): void;
}

/**
 * The on-screen hand pointer: a ring that fills while the hand holds over a
 * target. Driven imperatively at camera rate so following the hand never
 * re-renders the page underneath.
 */
export function HandCursor({ ref }: { ref: Ref<HandCursorHandle> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      update(point, progress, engaged) {
        const root = rootRef.current;
        if (!root) return;
        if (!point) {
          root.style.opacity = "0";
          return;
        }
        root.style.opacity = "1";
        root.style.transform = `translate3d(${point.x - SIZE / 2}px, ${point.y - SIZE / 2}px, 0)`;
        root.dataset.engaged = engaged ? "true" : "false";
        if (progressRef.current) {
          progressRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
        }
      },
    }),
    [],
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-engaged="false"
      className="group pointer-events-none fixed left-0 top-0 z-[1000] opacity-0 transition-opacity duration-150 will-change-transform"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full drop-shadow-[0_0_12px_rgba(0,0,0,0.6)] transition-transform duration-150 group-data-[engaged=true]:scale-110"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="rgba(255,255,255,0.12)"
          stroke="white"
          strokeOpacity={0.85}
          strokeWidth={4}
        />
        <circle
          ref={progressRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          className="stroke-primary"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={7} fill="white" />
      </svg>
    </div>
  );
}
