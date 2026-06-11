"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kinetofun-display-settings";

export interface DisplaySettings {
  largeText: boolean;
  reduceMotion: boolean;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  largeText: false,
  reduceMotion: false,
};

function loadSettings(): DisplaySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: DisplaySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
  } catch {
    // Silent fail on storage errors
  }
}

function applySettings(settings: DisplaySettings): void {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  if (settings.largeText) {
    html.setAttribute("data-large-text", "true");
  } else {
    html.removeAttribute("data-large-text");
  }
  if (settings.reduceMotion) {
    html.setAttribute("data-reduce-motion", "true");
  } else {
    html.removeAttribute("data-reduce-motion");
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applySettings(loaded);
    setIsLoaded(true);
  }, []);

  const updateSettings = (updates: Partial<DisplaySettings>): void => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  };

  return {
    settings,
    updateSettings,
    isLoaded,
  };
}
