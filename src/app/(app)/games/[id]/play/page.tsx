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
            <p className="mt-6 text-sm font-medium text-white/60">
              Launching…
            </p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {game.title}
            </h1>
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

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/games/${game.id}`} size="lg" variant="secondary">
                ✕ End session
              </ButtonLink>
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
