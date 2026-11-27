"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addFavorite as apiAddFavorite,
  fetchFavoriteGameIds,
  removeFavorite as apiRemoveFavorite,
} from "@/services/favorites.service";
import { useSession } from "@/features/auth/session-context";

// Shared singleton (module-level, like useGames/useContinuePlaying) so every
// GameCard's heart button reflects the same state without prop drilling.
let favoriteIds = new Set<string>();
let loaded = false;
let inflight: Promise<string[]> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function ensureLoaded(): void {
  if (loaded || inflight) return;
  inflight = fetchFavoriteGameIds()
    .then((ids) => {
      favoriteIds = new Set(ids);
      return ids;
    })
    .catch(() => [])
    .finally(() => {
      loaded = true;
      inflight = null;
      emit();
    });
}

/** Clear cached favorites so the next mount refetches (call on logout). */
export function invalidateFavorites(): void {
  favoriteIds = new Set();
  loaded = false;
  inflight = null;
}

export function useFavorites() {
  const { isAuthenticated, isLoading } = useSession();
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Signed-out visitors have no favorites, so skip the request that would 401.
  useEffect(() => {
    if (isAuthenticated) ensureLoaded();
  }, [isAuthenticated]);

  const isFavorite = useCallback((gameId: string) => favoriteIds.has(gameId), []);

  const toggleFavorite = useCallback(async (gameId: string) => {
    const wasFavorite = favoriteIds.has(gameId);
    if (wasFavorite) favoriteIds.delete(gameId);
    else favoriteIds.add(gameId);
    emit();

    try {
      if (wasFavorite) await apiRemoveFavorite(gameId);
      else await apiAddFavorite(gameId);
    } catch {
      // Revert the optimistic update on failure.
      if (wasFavorite) favoriteIds.add(gameId);
      else favoriteIds.delete(gameId);
      emit();
    }
  }, []);

  return { isFavorite, toggleFavorite, loaded: loaded || (!isLoading && !isAuthenticated) };
}
