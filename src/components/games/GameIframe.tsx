"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Typed events a game can send to the parent app via postMessage. */
export type GameEvent =
  | { type: "GAME_COMPLETE"; score: number }
  | { type: "XP_EARNED"; amount: number }
  | { type: "ACHIEVEMENT_UNLOCKED"; id: string }
  // Player chose to leave (e.g. "Back to games"), with no final score.
  | { type: "GAME_EXIT" };

// Smallest text that reads from a sofa on a 1080p TV; the bridge in each game raises anything smaller.
const TV_MIN_TEXT_PX = 24;

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
  /** Called when the game sends a GAME_EXIT event */
  onExit?: () => void;
  /** Lets the page message the game (for example to ask it to step back). */
  frameRef?: RefObject<HTMLIFrameElement | null>;
  /** Fullscreen only: render the game this many times smaller, then enlarge it to fill the screen. */
  scale?: number;
}

export default function GameIframe({
  src,
  fullscreen = false,
  onGameComplete,
  onXpEarned,
  onAchievementUnlocked,
  onExit,
  frameRef,
  scale = 1,
}: GameIframeProps) {
  const ownRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = frameRef ?? ownRef;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only accept messages from the same origin (our static files)
      if (event.origin !== window.location.origin) return;

      const data = event.data as GameEvent;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "GAME_COMPLETE" && onGameComplete) {
        // Scores are stored as whole numbers; some games report distances or times with decimals.
        onGameComplete(typeof data.score === "number" && Number.isFinite(data.score) ? Math.max(0, Math.round(data.score)) : 0);
      } else if (data.type === "XP_EARNED" && onXpEarned) {
        onXpEarned(typeof data.amount === "number" ? data.amount : 0);
      } else if (data.type === "ACHIEVEMENT_UNLOCKED" && onAchievementUnlocked) {
        onAchievementUnlocked(typeof data.id === "string" ? data.id : "");
      } else if (data.type === "GAME_EXIT" && onExit) {
        onExit();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onGameComplete, onXpEarned, onAchievementUnlocked, onExit]);

  const enlarged = fullscreen && scale > 1;

  useEffect(() => {
    const frame = iframeRef.current;
    if (!enlarged || !frame) return;
    function sendMinFont() {
      // 24px on a 1080p screen, expressed in the game's own (smaller) pixels.
      const screen = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      const minFont = Math.round((TV_MIN_TEXT_PX * screen) / scale);
      frame?.contentWindow?.postMessage({ type: "KF_TV_TEXT", minFont }, window.location.origin);
    }
    sendMinFont();
    frame.addEventListener("load", sendMinFont);
    return () => frame.removeEventListener("load", sendMinFont);
  }, [enlarged, scale, iframeRef]);

  if (enlarged) {
    // The game sees a laptop-sized viewport, so vh units, canvases and pointer maths stay consistent.
    const size = `${100 / scale}%`;
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={src}
          allow="camera; microphone; autoplay; fullscreen"
          className="absolute left-0 top-0 border-0"
          style={{ width: size, height: size, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          title="Game"
        />
      </div>
    );
  }

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
