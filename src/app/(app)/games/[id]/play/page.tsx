"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { gamesService } from "@/services";
import { ButtonLink } from "@/components/ui/Button";

type Phase = "loading" | "playing";

export default function GameLaunchPage() {
  const params = useParams<{ id: string }>();
  const game = gamesService.getById(params.id);

  const [phase, setPhase] = useState<Phase>("loading");
  const [elapsed, setElapsed] = useState(0);

  // Simulate a launch sequence, then a running session timer. This is pure UI
  // — the real game runtime and lifecycle arrive in Phase 3.
  useEffect(() => {
    if (!game) return;
    const boot = setTimeout(() => setPhase("playing"), 1800);
    return () => clearTimeout(boot);
  }, [game]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-white">Game not found</h1>
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
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative flex w-full max-w-xl flex-col items-center">
        {phase === "loading" ? (
          <>
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="mt-6 text-lg font-medium text-zinc-200">
              Launching…
            </p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {game.title}
            </h1>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Now playing
            </span>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              {game.title}
            </h1>
            <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-200">
              {mins}:{secs}
            </p>

            <div className="mt-8 w-full rounded-2xl border border-white/15 bg-black/40 p-5 text-left">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-300">
                Controls
              </h2>
              <p className="mt-2 text-zinc-200">
                Use your keyboard / controller for now.{" "}
                <span className="text-accent-2">
                  Gesture controls arrive with the camera input layer (Phase 4).
                </span>
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/games/${game.id}`} size="lg" variant="secondary">
                ✕ End session
              </ButtonLink>
              <ButtonLink href="/leaderboard" size="lg" variant="ghost">
                View leaderboard
              </ButtonLink>
            </div>

            <p className="mt-6 text-xs text-zinc-400">
              Placeholder launch screen — no real gameplay yet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
