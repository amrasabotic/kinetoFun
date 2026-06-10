"use client";

import { useCallback, useEffect, useState } from "react";
import type { Score, Session } from "@/types";

export interface RawProfileStats {
  gamesPlayed: number;
  totalSessions: number;
  bestScore: number;
  recentScores: Score[];
  recentSessions: Session[];
}

export interface UseProfileStats {
  stats: RawProfileStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch the current user's profile stats from `/api/profile/stats`.
 * Returns raw Score[] and Session[] without game enrichment — callers
 * enrich with games from `useGames()`.
 */
export function useProfileStats(): UseProfileStats {
  const [stats, setStats] = useState<RawProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/stats");
      if (!res.ok) throw new Error("Failed to load stats.");
      const data: RawProfileStats = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refresh: load };
}
