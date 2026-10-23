"use client";

import { useSyncExternalStore } from "react";

// Games were built for laptop screens; on a 1080p TV they are enlarged by this much unless the registry says otherwise.
export const DEFAULT_TV_SCALE = 2;

function screenFactor(): number {
  // Relative to 1080p, by whichever side runs out first, so a screen that isn't 16:9 never crops the game.
  return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}

function readOverride(): number {
  // ?tvscale=1.8 replaces the game's scale while tuning on a real TV.
  const value = Number(new URLSearchParams(window.location.search).get("tvscale"));
  return value > 0 ? value : 0;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** How much to enlarge a game on this screen; 1 when not on a TV. */
export function useTvGameScale(tv: boolean, gameScale = DEFAULT_TV_SCALE): number {
  const factor = useSyncExternalStore(subscribe, screenFactor, () => 1);
  const override = useSyncExternalStore(subscribe, readOverride, () => 0);
  if (!tv) return 1;
  return Math.max(1, factor * (override || gameScale));
}
