"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setTvMode } from "./tv-mode";

/**
 * Keeps the TV mode flag in step with how this browser is being used.
 *
 * The Pi always boots into /tvsetup, so reaching any /tvsetup screen marks the
 * device as a TV. `?tv=0` on any page turns it off again (a developer laptop
 * that was used to simulate a TV), and `?tv=1` turns it on without pairing.
 */
export function TvModeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("tv");
    if (override === "0") setTvMode(false);
    else if (override === "1" || pathname.startsWith("/tvsetup")) setTvMode(true);
  }, [pathname]);

  return null;
}
