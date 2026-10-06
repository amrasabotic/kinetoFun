"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session-context";
import { shopAction } from "@/features/rewards/useShop";
import { cn } from "@/lib/utils";

/**
 * Unlock button for a locked secret world. Two taps (tap, then confirm) so a
 * child cannot spend tickets by accident.
 */
export function UnlockWorldButton({
  gameId,
  title,
  cost,
  onUnlocked,
}: {
  gameId: string;
  title: string;
  cost: number;
  onUnlocked: () => void;
}) {
  const { user, refresh } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const balance = user?.tickets ?? 0;
  const short = balance < cost;

  async function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await shopAction("unlock-world", { gameId });
      toast.success(`${title} unlocked!`);
      await refresh();
      onUnlocked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlock this world.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        data-focusable
        disabled={short || busy}
        onClick={onClick}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed",
          short
            ? "bg-white/20 text-white/70"
            : confirming
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-amber-400 text-amber-950 hover:bg-amber-300",
        )}
      >
        {busy ? "Unlocking…" : confirming ? "Tap again to confirm" : `🔒 Unlock for 🎟️ ${cost}`}
      </button>
      {short && (
        <p className="text-xs text-white/70">
          You need {cost - balance} more tickets. Finish games to earn them!
        </p>
      )}
    </div>
  );
}
