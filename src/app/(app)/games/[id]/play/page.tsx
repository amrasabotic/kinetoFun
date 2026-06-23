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
  const [scoreInput, setScoreInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleEndSession = useCallback(async (scoreOverride?: number) => {
    if (!game) return;
    const raw = scoreOverride ?? parseInt(scoreInput.trim(), 10);
    const score = Number.isFinite(raw) && raw >= 0 ? raw : 0;

    setPhase("submitting");
    setSubmitError(null);
    try {
      const earned = await postScore(game.id, score);
      setXpEarned(earned);
      await endSession(sessionIdRef.current);
      invalidateContinuePlaying();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save score.";
      setSubmitError(msg);
      toast.error("Could not save score. Please try again.");
    } finally {
      setPhase("done");
    }
  }, [game, scoreInput, refresh]);

  // Auto-submit when game sends GAME_COMPLETE via postMessage
  const handleGameComplete = useCallback((score: number) => {
    handleEndSession(score);
  }, [handleEndSession]);

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

  // ── Submitting / done overlays (shared between iframe and placeholder) ───
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

  // ── Iframe mode: game is registered ─────────────────────────────────────
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
      <div className="flex flex-col gap-4">
        {/* Header bar */}
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

        {/* Game iframe */}
        <GameIframe
          src={entry.indexPath}
          onGameComplete={handleGameComplete}
        />

        {/* Manual score fallback — shown below iframe for games without postMessage yet */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="score-input" className="text-xs font-medium text-foreground/40 uppercase tracking-widest">
              Score (if not auto-submitted)
            </label>
            <input
              id="score-input"
              ref={inputRef}
              type="number"
              min={0}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              placeholder="0"
              className="w-40 rounded-xl border border-white/[0.12] bg-black/30 px-4 py-2 font-mono text-lg font-bold tabular-nums text-white placeholder-white/20 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={() => handleEndSession()}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/30 focus:outline-none"
          >
            ✓ End &amp; save score
          </button>
          {submitError && (
            <p className="w-full text-xs text-red-400">{submitError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Placeholder mode: game not yet built / not in registry ───────────────
  return (
    <div
      className={`relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${game.cover} p-8 text-center`}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative flex w-full max-w-xl flex-col items-center">
        {phase === "loading" ? (
          <>
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-primary shadow-[0_0_20px_rgba(140,92,255,0.4)]" />
            <p className="mt-6 text-sm font-medium text-white/60">Launching…</p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {game.title}
            </h1>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Now playing
            </span>

            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              {game.title}
            </h1>

            <p className="mt-2 font-mono text-2xl tabular-nums text-primary/80">
              {mins}:{secs}
            </p>

            <div className="relative mt-8 w-full overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.06] p-5 text-left backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40">
                // Controls
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Use your keyboard / controller for now.{" "}
                <span className="text-primary/80">
                  Gesture controls arrive with the camera input layer (Phase 4).
                </span>
              </p>
            </div>

            <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <label
                htmlFor="score-input-placeholder"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40"
              >
                // Enter your score
              </label>
              <input
                id="score-input-placeholder"
                ref={inputRef}
                type="number"
                min={0}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-white/[0.12] bg-black/30 px-4 py-2.5 font-mono text-xl font-bold tabular-nums text-white placeholder-white/20 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {submitError && (
                <p className="mt-2 text-xs text-red-400">{submitError}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handleEndSession()}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/20 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-primary/30 focus:outline-none"
                data-focusable
              >
                ✓ End &amp; save score
              </button>
              <ButtonLink href="/leaderboard" size="lg" variant="ghost">
                View leaderboard
              </ButtonLink>
            </div>

            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-white/25">
              // Add this game to src/games/registry.ts and run `npm run build:games`
            </p>
          </>
        )}
      </div>
    </div>
  );
}
