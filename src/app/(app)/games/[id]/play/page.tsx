"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGames } from "@/features/games/useGames";
import { findGame } from "@/services/games.service";
import { startSession, endSession } from "@/services/sessions.service";
import { invalidateContinuePlaying } from "@/features/sessions/useContinuePlaying";
import { ButtonLink } from "@/components/ui/Button";

type Phase = "loading" | "playing" | "submitting" | "done";

async function postScore(gameId: string, score: number): Promise<void> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, score }),
  });
  if (!res.ok && res.status !== 401) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to submit score.");
  }
}

export default function GameLaunchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { games, loading } = useGames();
  const game = findGame(games, params.id);

  const [phase, setPhase] = useState<Phase>("loading");
  const [elapsed, setElapsed] = useState(0);
  const [scoreInput, setScoreInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!game) return;
    const boot = setTimeout(() => setPhase("playing"), 1800);
    return () => clearTimeout(boot);
  }, [game]);

  // Open a play session once, when the game first loads. Fire-and-forget:
  // failure (e.g. signed out) just means no session is recorded.
  useEffect(() => {
    if (!game || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(game.id)
      .then((id) => {
        sessionIdRef.current = id;
        if (id) invalidateContinuePlaying();
      })
      .catch(() => {
        /* non-fatal — session tracking is best-effort */
      });
  }, [game]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function handleEndSession() {
    if (!game) return;
    const raw = parseInt(scoreInput.trim(), 10);
    const score = Number.isFinite(raw) && raw >= 0 ? raw : 0;

    setPhase("submitting");
    setSubmitError(null);
    try {
      await postScore(game.id, score);
      await endSession(sessionIdRef.current);
      invalidateContinuePlaying();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save score.");
    } finally {
      setPhase("done");
      router.push(`/games/${game.id}`);
    }
  }

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
        ) : phase === "submitting" ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="mt-4 text-sm text-white/60">Saving score…</p>
          </>
        ) : (
          <>
            {/* Now playing badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Now playing
            </span>

            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              {game.title}
            </h1>

            {/* Timer */}
            <p className="mt-2 font-mono text-2xl tabular-nums text-primary/80">
              {mins}:{secs}
            </p>

            {/* Controls card */}
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

            {/* Score entry */}
            <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <label
                htmlFor="score-input"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40"
              >
                // Enter your score
              </label>
              <input
                id="score-input"
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
                onClick={handleEndSession}
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
              // Placeholder — no real gameplay yet
            </p>
          </>
        )}
      </div>
    </div>
  );
}
