"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/types";

// Per-board cache: "global" or a game id slug.
const cache = new Map<string, LeaderboardEntry[]>();
const inflight = new Map<string, Promise<LeaderboardEntry[]>>();

export interface UseLeaderboard {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

async function fetchBoard(gameId: string | null): Promise<LeaderboardEntry[]> {
  const url = gameId
    ? `/api/leaderboard?gameId=${encodeURIComponent(gameId)}`
    : "/api/leaderboard";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load leaderboard.");
  const json = await res.json();
  return json.entries as LeaderboardEntry[];
}

/**
 * Load a leaderboard from `/api/leaderboard`.
 * Pass `gameId = null` (or omit) for the global board.
 * Results are cached per board key for the session lifetime.
 */
export function useLeaderboard(gameId: string | null = null): UseLeaderboard {
  const key = gameId ?? "global";

  const [entries, setEntries] = useState<LeaderboardEntry[]>(cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const k = gameId ?? "global";

    if (cache.has(k)) {
      setEntries(cache.get(k)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const req = inflight.get(k) ?? fetchBoard(gameId);
    inflight.set(k, req);

    req
      .then((list) => {
        cache.set(k, list);
        inflight.delete(k);
        if (active) setEntries(list);
      })
      .catch((err) => {
        inflight.delete(k);
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  return { entries, loading, error };
}
