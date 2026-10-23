"use client";

import { useSyncExternalStore } from "react";

// Games were built for laptop screens; on a TV they render at this size and are enlarged to fit.
const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

function readScale(): number {
  // ?tvscale=1.8 overrides the computed factor while tuning on a real TV.
  const override = Number(new URLSearchParams(window.location.search).get("tvscale"));
  if (override > 0) return override;
  // Whichever side runs out first, so a screen that isn't 16:9 never crops the game.
  return Math.max(1, Math.min(window.innerWidth / VIRTUAL_WIDTH, window.innerHeight / VIRTUAL_HEIGHT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** How much to enlarge a game on this screen; 1 when not on a TV. */
export function useTvGameScale(tv: boolean): number {
  const scale = useSyncExternalStore(subscribe, readScale, () => 1);
  return tv ? scale : 1;
}
