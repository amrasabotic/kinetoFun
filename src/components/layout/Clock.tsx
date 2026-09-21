"use client";

import { useEffect, useState } from "react";

/** Live clock for the top bar, console-dashboard style. */
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // Render nothing on the server / first paint to avoid hydration mismatch.
  if (!now) return <span className="w-14" />;

  return (
    <time className="text-sm font-medium tabular-nums text-foreground/70">
      {now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}
