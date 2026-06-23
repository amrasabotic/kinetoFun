"use client";

import { useEffect, useRef } from "react";

/** Typed events a game can send to the parent app via postMessage. */
export type GameEvent =
  | { type: "GAME_COMPLETE"; score: number }
  | { type: "XP_EARNED"; amount: number }
  | { type: "ACHIEVEMENT_UNLOCKED"; id: string };

interface GameIframeProps {
  /** URL to the game's index.html under /public/games/ */
  src: string;
  /** Fill the parent container edge-to-edge with no border-radius */
  fullscreen?: boolean;
  /** Called when the game sends a GAME_COMPLETE event */
  onGameComplete?: (score: number) => void;
  /** Called when the game sends an XP_EARNED event */
  onXpEarned?: (amount: number) => void;
  /** Called when the game sends an ACHIEVEMENT_UNLOCKED event */
  onAchievementUnlocked?: (id: string) => void;
}

export default function GameIframe({
  src,
  fullscreen = false,
  onGameComplete,
  onXpEarned,
  onAchievementUnlocked,
}: GameIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only accept messages from the same origin (our static files)
      if (event.origin !== window.location.origin) return;

      const data = event.data as GameEvent;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "GAME_COMPLETE" && onGameComplete) {
        onGameComplete(typeof data.score === "number" ? data.score : 0);
      } else if (data.type === "XP_EARNED" && onXpEarned) {
        onXpEarned(typeof data.amount === "number" ? data.amount : 0);
      } else if (data.type === "ACHIEVEMENT_UNLOCKED" && onAchievementUnlocked) {
        onAchievementUnlocked(typeof data.id === "string" ? data.id : "");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onGameComplete, onXpEarned, onAchievementUnlocked]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      allow="camera; microphone; autoplay; fullscreen"
      className={fullscreen ? "w-full flex-1 border-0" : "w-full rounded-2xl border-0"}
      style={fullscreen ? { flex: 1, minHeight: 0 } : { height: "calc(100vh - 120px)", minHeight: 500 }}
      title="Game"
    />
  );
}
