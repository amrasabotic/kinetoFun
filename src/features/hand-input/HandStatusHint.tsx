"use client";

import { CameraOff, Hand, LoaderCircle } from "lucide-react";
import type { TrackerStatus } from "./tracker";

const MESSAGES: Partial<Record<TrackerStatus, string>> = {
  denied: "Camera access is blocked, so hand control is off.",
  "no-camera": "No camera found. Connect a webcam to control the TV by hand.",
  error: "Hand control couldn't start. Restart the TV to try again.",
};

/**
 * One line at the bottom of the screen telling the player what hand control
 * is doing. Nothing shows while a hand is being tracked, and on screens with
 * nothing to select (the pairing QR code) only a camera problem is shown, so
 * the hint never sits over information the player needs.
 *
 * The delays are CSS animation delays rather than timers: the hint mounts the
 * moment the hand disappears and only becomes visible if it stays gone, so a
 * one-frame tracking dropout never flashes it.
 */
export function HandStatusHint({
  status,
  handVisible,
  hasTargets,
}: {
  status: TrackerStatus;
  handVisible: boolean;
  hasTargets: boolean;
}) {
  let icon: React.ReactNode;
  let text: string;
  let delay: string;

  if ((status === "loading" || status === "ready") && !hasTargets) {
    return null;
  } else if (status === "loading") {
    icon = <LoaderCircle className="h-7 w-7 animate-spin" />;
    text = "Starting hand control…";
    delay = "1s";
  } else if (status === "ready") {
    if (handVisible) return null;
    icon = <Hand className="h-7 w-7 text-accent" />;
    text = "Raise your hand to control the TV";
    delay = "2s";
  } else {
    icon = <CameraOff className="h-7 w-7 text-destructive" />;
    text = MESSAGES[status] ?? MESSAGES.error!;
    delay = "0s";
  }

  return (
    <div
      key={`${status}-${handVisible}`}
      role="status"
      className="pointer-events-none fixed inset-x-0 top-8 z-[999] flex justify-center px-6"
    >
      <div
        className="flex items-center gap-4 rounded-full border border-white/15 bg-black/60 px-8 py-4 text-2xl font-semibold text-white/90 backdrop-blur-xl"
        style={{ animation: `kf-hint-in 0.5s ease ${delay} both` }}
      >
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
