"use client";

// Whether this browser is a KinetoFun TV (a Raspberry Pi in front of a
// television) rather than a desktop or laptop.
//
// Screens outside the TV routes use this to swap mouse-only affordances for
// hand-controlled ones (for example where a game returns to when it ends).
// With the flag off, the platform behaves exactly as it does on a computer.
//
// The flag is per browser and outlives pairing: disconnecting a TV signs it
// out, but the device is still a TV, so it stays on until `?tv=0` clears it.

import { useSyncExternalStore } from "react";

const TV_MODE_KEY = "kf_tv_mode";
const CHANGE_EVENT = "kf:tv-mode-change";

export function isTvMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TV_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTvMode(on: boolean): void {
  if (isTvMode() === on) return;
  try {
    if (on) window.localStorage.setItem(TV_MODE_KEY, "1");
    else window.localStorage.removeItem(TV_MODE_KEY);
  } catch {
    // Storage disabled: TV screens still work, the flag just isn't remembered.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** False on the server and during hydration, then the stored value. */
export function useTvMode(): boolean {
  return useSyncExternalStore(subscribe, isTvMode, () => false);
}
