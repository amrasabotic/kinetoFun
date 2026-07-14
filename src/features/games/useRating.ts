"use client";

import { useCallback, useEffect, useState } from "react";

export function useUserRating(gameId: string | null) {
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchRating = async () => {
      try {
        const response = await fetch(
          `/api/games/${encodeURIComponent(gameId)}/rating`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = (await response.json()) as { rating?: { score: number } | null };
        if (active) {
          setRating(json.rating?.score ?? null);
        }
      } catch (err) {
        console.error("[useRating] Failed to fetch user rating:", err);
        if (active) setRating(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRating();
    return () => {
      active = false;
    };
  }, [gameId]);

  const submitRating = useCallback(
    async (score: number) => {
      if (!gameId) return false;
      try {
        const response = await fetch(
          `/api/games/${encodeURIComponent(gameId)}/rating`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ score }),
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setRating(score);
        return true;
      } catch (err) {
        console.error("[useRating] Failed to submit rating:", err);
        return false;
      }
    },
    [gameId],
  );

  return { rating, loading, submitRating };
}
