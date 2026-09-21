"use client";

import { useEffect, useState } from "react";
import { fetchRecentGameIds } from "@/services/sessions.service";

// Module-level cache of recent game IDs. Cleared by invalidateContinuePlaying()
// after a new session is created so the dashboard refetches on next mount.
let cached: string[] | null = null;
let inflight: Promise<string[]> | null = null;

/** Clear the cache so the next mount of useContinuePlaying refetches. */
export function invalidateContinuePlaying(): void {
  cached = null;
  inflight = null;
}

export interface UseContinuePlaying {
  gameIds: string[];
  loading: boolean;
}

/**
 * Loads the current user's recently-played game IDs from
 * `/api/sessions/recent`. Cached at module level for the session.
 */
export function useContinuePlaying(enabled = true): UseContinuePlaying {
  const [gameIds, setGameIds] = useState<string[]>(cached ?? []);
  const [loading, setLoading] = useState<boolean>(enabled && cached === null);

  useEffect(() => {
    if (!enabled) {
      setGameIds([]);
      setLoading(false);
      return;
    }

    let active = true;

    if (cached) {
      setGameIds(cached);
      setLoading(false);
      return;
    }

    inflight ??= fetchRecentGameIds();
    inflight
      .then((ids) => {
        cached = ids;
        if (active) setGameIds(ids);
      })
      .catch(() => {
        inflight = null; // allow retry on next mount
        if (active) setGameIds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { gameIds, loading };
}
