"use client";

import { useEffect } from "react";
import { playRewardChime } from "@/lib/rewards/chime";

export interface RewardToast {
  key: string;
  kind: "collectible" | "badge";
  emoji: string;
  title: string;
  description: string;
  tickets?: number;
}

const TOAST_MS = 3000;
// When several are waiting, show each briefly so the banner never lingers.
const QUEUED_TOAST_MS = 1800;

/**
 * Shows queued reward notifications one at a time over a running game. It
 * ignores pointer input and sits at the top edge so it never covers the play
 * area or the camera feed.
 */
export function RewardToasts({
  queue,
  onDismiss,
}: {
  queue: RewardToast[];
  onDismiss: () => void;
}) {
  const current = queue[0];
  const duration = queue.length > 1 ? QUEUED_TOAST_MS : TOAST_MS;

  useEffect(() => {
    if (!current) return;

    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [current, duration, onDismiss]);

  useEffect(() => {
    if (current) playRewardChime(current.kind);
  }, [current]);

  if (!current) return null;

  return (
    <div
      key={current.key}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-2 z-50 w-[min(26rem,calc(100vw-2rem))]"
      style={{ animation: `kf-reward-toast ${duration}ms ease-in-out forwards` }}
    >
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-300/60 bg-black/80 px-4 py-2.5 shadow-[0_0_40px_rgba(251,191,36,0.35)]">
        <span className="text-4xl" aria-hidden>{current.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            {current.kind === "badge" ? "New badge!" : "Collectible unlocked!"}
          </p>
          <p className="truncate text-lg font-black text-white">{current.title}</p>
          
        </div>
        {current.tickets ? (
          <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-lg font-black text-amber-950">
            🎟️ +{current.tickets}
          </span>
        ) : null}
      </div>
    </div>
  );
}
