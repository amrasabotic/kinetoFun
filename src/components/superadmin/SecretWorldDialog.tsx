"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { Game } from "@/types";
import { AdminButton } from "@/components/superadmin/ui";
import { useI18n } from "@/features/i18n/I18nProvider";

/** Set or clear the ticket price that makes a game a secret world. */
export function SecretWorldDialog({
  game,
  onClose,
  onSaved,
}: {
  game: Game;
  onClose: () => void;
  onSaved: (game: Game) => void;
}) {
  const [price, setPrice] = useState(game.unlockCost ? String(game.unlockCost) : "300");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, serverText } = useI18n();
  const sw = t.adminMedia.secretWorld;

  async function save(unlockCost: number | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/games/${game.id}/secret-world`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockCost }),
      });
      const json = (await res.json().catch(() => ({}))) as { game?: Game; error?: string };
      if (!res.ok || !json.game) throw new Error(json.error ?? "Failed to update the game.");
      onSaved(json.game);
    } catch (err) {
      setError(serverText(err instanceof Error ? err.message : "Failed to update the game."));
    } finally {
      setBusy(false);
    }
  }

  const n = Number.parseInt(price, 10);
  const valid = Number.isFinite(n) && n >= 1 && n <= 5000;

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{sw.title(game.title)}</h2>
            <p className="text-sm text-slate-400">
              {game.unlockCost ? sw.currently(game.unlockCost) : sw.currentlyFree}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {sw.body}
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {sw.price}
        </label>
        <input
          type="number"
          min={1}
          max={5000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-2 h-10 w-40 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {game.unlockCost && (
            <AdminButton variant="secondary" onClick={() => save(null)} disabled={busy}>
              {sw.makeFree}
            </AdminButton>
          )}
          <AdminButton variant="secondary" onClick={onClose} disabled={busy}>
            {t.common.actions.cancel}
          </AdminButton>
          <AdminButton onClick={() => save(n)} disabled={busy || !valid || n === game.unlockCost}>
            {busy ? t.common.actions.saving : game.unlockCost ? sw.update : sw.make}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
