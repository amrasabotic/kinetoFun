"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setTvMode } from "./tv-mode";

/**
 * Keeps the TV mode flag in step with how this browser is being used.
 *
 * The Pi only ever shows /tvsetup screens and game play pages, so a /tvsetup
 * screen marks the browser as a TV, any other website page marks it as not a
 * TV, and a play page keeps the current value. `?tv=0` / `?tv=1` force it.
 */
export function TvModeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("tv");
    if (override === "0") setTvMode(false);
    else if (override === "1" || pathname.startsWith("/tvsetup")) setTvMode(true);
    else if (!/^\/games\/[^/]+\/play/.test(pathname)) setTvMode(false);
  }, [pathname]);

  return null;
}
