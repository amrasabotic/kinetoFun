"use client";

import { useCallback, useEffect, useState } from "react";
import type { RewardsOverview } from "@/lib/rewards/catalog";

async function fetchRewards(): Promise<RewardsOverview> {
  const res = await fetch("/api/rewards");
  if (!res.ok) throw new Error("Failed to load rewards.");
  return (await res.json()) as RewardsOverview;
}

/** Fetch the current user's tickets, streak and badges from `/api/rewards`. */
export function useRewards() {
  const [rewards, setRewards] = useState<RewardsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((p: Promise<RewardsOverview>) => {
    return p
      .then((data) => {
        setRewards(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load rewards.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apply(fetchRewards());
  }, [apply]);

  const refresh = useCallback(() => {
    setLoading(true);
    return apply(fetchRewards());
  }, [apply]);

  return { rewards, loading, error, refresh };
}
