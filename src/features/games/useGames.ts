"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/types";
import { fetchGames } from "@/services/games.service";

// Module-level cache so the catalog is fetched once and shared across every
// page/navigation (the data is small and rarely changes within a session).
let cachedGames: Game[] | null = null;
let inflight: Promise<Game[]> | null = null;

export interface UseGames {
  games: Game[];
  /** True until the first fetch settles. */
  loading: boolean;
  error: string | null;
}

/**
 * Load the games catalog from `/api/games` (Supabase-backed). Derive views with
 * the pure selectors in `@/services/games.service` over `games`.
 */
export function useGames(): UseGames {
  const [games, setGames] = useState<Game[]>(cachedGames ?? []);
  const [loading, setLoading] = useState<boolean>(cachedGames === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (cachedGames) {
      setGames(cachedGames);
      setLoading(false);
      return;
    }

    inflight ??= fetchGames();
    inflight
      .then((list) => {
        cachedGames = list;
        if (active) setGames(list);
      })
      .catch((err) => {
        inflight = null; // allow a retry on the next mount
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load games.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { games, loading, error };
}
