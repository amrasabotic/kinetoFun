"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShopOverview } from "@/lib/rewards/shop";

async function fetchShop(): Promise<ShopOverview> {
  const res = await fetch("/api/shop");
  if (!res.ok) throw new Error("The shop is unavailable right now.");
  return (await res.json()) as ShopOverview;
}

/** POST to a shop action; resolves with the JSON body or throws its error message. */
export async function shopAction<T>(path: string, body: object = {}): Promise<T> {
  const res = await fetch(`/api/shop/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json;
}

/** The current player's shop state from `/api/shop`. */
export function useShop(enabled = true) {
  const [shop, setShop] = useState<ShopOverview | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((p: Promise<ShopOverview>) => {
    return p
      .then((data) => {
        setShop(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "The shop is unavailable right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (enabled) apply(fetchShop());
  }, [apply, enabled]);

  const refresh = useCallback(() => apply(fetchShop()), [apply]);

  return { shop, loading, error, refresh };
}
