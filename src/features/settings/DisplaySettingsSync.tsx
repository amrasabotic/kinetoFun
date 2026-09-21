"use client";

import { useSettings } from "./useSettings";

/**
 * Applies persisted display settings (large text / reduce motion) on every
 * page load, not just when the Settings page happens to mount, and syncs them
 * with the signed-in user's server-side preference. Renders nothing.
 */
export function DisplaySettingsSync() {
  useSettings();
  return null;
}
