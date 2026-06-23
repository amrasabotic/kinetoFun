"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session-context";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useGames } from "@/features/games/useGames";
import { findGame } from "@/services/games.service";
import { startSession, endSession } from "@/services/sessions.service";
import { invalidateContinuePlaying } from "@/features/sessions/useContinuePlaying";
import { ButtonLink } from "@/components/ui/Button";
import GameIframe from "@/components/games/GameIframe";
import { getGameEntry } from "@/games/registry";

type Phase = "loading" | "playing" | "submitting" | "done";

async function postScore(gameId: string, score: number): Promise<number> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, score }),
  });
  if (!res.ok && res.status !== 401) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to submit score.");
  }
  const json = await res.json().catch(() => ({}));
  return (json as { xpEarned?: number }).xpEarned ?? 0;
}

export default function GameLaunchPage() {
  return (
    <ProtectedRoute>
      <GameLaunchContent />
    </ProtectedRoute>
  );
}

function GameLaunchContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useSession();
  const { games, loading } = useGames();
  const game = findGame(games, params.id);
  const entry = getGameEntry(params.id);

  const [phase, setPhase] = useState<Phase>("loading");
  const [elapsed, setElapsed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!game) return;
    const boot = setTimeout(() => setPhase("playing"), 1800);
    return () => clearTimeout(boot);
  }, [game]);

  useEffect(() => {
    if (!game || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(game.id)
      .then((id) => {
        sessionIdRef.current = id;
        if (id) invalidateContinuePlaying();
      })
      .catch(() => { /* non-fatal */ });
  }, [game]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const handleGameComplete = useCallback(async (score: number) => {
    if (!game) return;
    setPhase("submitting");
    try {
      const earned = await postScore(game.id, score);
      setXpEarned(earned);
      await endSession(sessionIdRef.current);
      invalidateContinuePlaying();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save score.";
      toast.error(msg);
    } finally {
      setPhase("done");
    }
  }, [game, refresh]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = setTimeout(() => {
      if (game) router.push(`/games/${game.id}`);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [phase, game, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Game not found</h1>
        <ButtonLink href="/library" variant="secondary">
          Back to Library
        </ButtonLink>
      </div>
    );
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  if (phase === "submitting") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-foreground/60">Saving score…</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 border border-primary/40">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Score saved!</h1>
          {xpEarned > 0 && (
            <p className="text-xl font-semibold text-primary">+{xpEarned} XP earned</p>
          )}
          <p className="text-sm text-foreground/60">Returning to game page…</p>
        </div>
      </div>
    );
  }

  // ── Iframe mode: game is registered and built ────────────────────────────
  if (entry) {
    if (phase === "loading") {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-primary shadow-[0_0_20px_rgba(140,92,255,0.4)]" />
            <p className="text-sm font-medium text-foreground/60">Launching {game.title}…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Now playing
            </span>
            <h1 className="text-lg font-bold text-foreground">{game.title}</h1>
          </div>
          <p className="font-mono text-sm tabular-nums text-foreground/50">{mins}:{secs}</p>
        </div>

        <GameIframe
          src={entry.indexPath}
          onGameComplete={handleGameComplete}
        />
      </div>
    );
  }

  // ── Placeholder mode: game not yet in registry ───────────────────────────
  return (
    <div
      className={`relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${game.cover} p-8 text-center`}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative flex w-full max-w-xl flex-col items-center gap-4">
        {phase === "loading" ? (
          <>
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-primary shadow-[0_0_20px_rgba(140,92,255,0.4)]" />
            <p className="text-sm font-medium text-white/60">Launching…</p>
            <h1 className="text-3xl font-black text-white sm:text-4xl">{game.title}</h1>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">{game.title}</h1>
            <p className="text-white/60 text-sm max-w-xs">
              This game is coming soon. Check back after the next build.
            </p>
            <ButtonLink href={`/games/${game.id}`} variant="secondary">
              Back to game page
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}
