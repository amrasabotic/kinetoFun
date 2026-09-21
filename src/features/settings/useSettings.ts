"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/features/auth/session-context";

const STORAGE_KEY = "kinetofun-display-settings";

export interface DisplaySettings {
  largeText: boolean;
  reduceMotion: boolean;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  largeText: false,
  reduceMotion: false,
};

function loadFromStorage(): DisplaySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(next: DisplaySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Silent fail on storage errors
  }
}

function applyToDom(next: DisplaySettings): void {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  if (next.largeText) html.setAttribute("data-large-text", "true");
  else html.removeAttribute("data-large-text");
  if (next.reduceMotion) html.setAttribute("data-reduce-motion", "true");
  else html.removeAttribute("data-reduce-motion");
}

// Shared singleton (like useGames/useFavorites) so display settings apply on
// every page load — not just when the Settings page happens to mount — and
// every mounted instance (the global sync component + the Settings page
// itself) reflects the same state.
let settings: DisplaySettings = DEFAULT_SETTINGS;
let initialized = false;
let syncedFromServer = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function setSettings(next: DisplaySettings): void {
  settings = next;
  saveToStorage(next);
  applyToDom(next);
  emit();
}

export function useSettings() {
  const { user } = useSession();
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!initialized) {
      initialized = true;
      settings = loadFromStorage();
      applyToDom(settings);
    }
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    forceRender((n) => n + 1);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // One-time sync from the signed-in user's server-persisted preference (the
  // cross-device source of truth) once it becomes available after login.
  useEffect(() => {
    if (syncedFromServer || !user) return;
    if (user.largeText === undefined && user.reduceMotion === undefined) return;
    syncedFromServer = true;
    setSettings({
      largeText: user.largeText ?? settings.largeText,
      reduceMotion: user.reduceMotion ?? settings.reduceMotion,
    });
  }, [user]);

  const updateSettings = useCallback(
    (updates: Partial<DisplaySettings>): void => {
      setSettings({ ...settings, ...updates });

      if (user) {
        fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }).catch(() => {
          // Best-effort — the local/DOM state already applied above.
        });
      }
    },
    [user],
  );

  return {
    settings,
    updateSettings,
    isLoaded: initialized,
  };
}
