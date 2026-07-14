"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session-context";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useGames } from "@/features/games/useGames";
import { findGame } from "@/services/games.service";
import { startSession, endSession } from "@/services/sessions.service";
import { invalidateContinuePlaying } from "@/features/sessions/useContinuePlaying";
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
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    if (!game) return;
    const boot = setTimeout(() => setPhase("playing"), 1800);
    return () => clearTimeout(boot);
  }, [game]);

  const endSessionOnce = useCallback(async () => {
    if (sessionEndedRef.current || !sessionIdRef.current) return;
    sessionEndedRef.current = true;
    try {
      await endSession(sessionIdRef.current);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (!game || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(game.id)
      .then((id) => {
        sessionIdRef.current = id;
        if (id) invalidateContinuePlaying();
      })
      .catch(() => { /* non-fatal */ });

    return () => {
      endSessionOnce();
    };
  }, [game, endSessionOnce]);

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
      await endSessionOnce();
      invalidateContinuePlaying();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save score.";
      toast.error(msg);
    } finally {
      setPhase("done");
    }
  }, [game, refresh, endSessionOnce]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = setTimeout(() => {
      if (game) router.push(`/games/${game.id}`);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [phase, game, router]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionEndedRef.current || !sessionIdRef.current) return;
      sessionEndedRef.current = true;
      fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        keepalive: true,
      }).catch(() => { /* non-fatal */ });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBeforeUnload();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return <FullScreenOverlay><Spinner /></FullScreenOverlay>;
  }

  if (!game || !entry) {
    return (
      <FullScreenOverlay>
        <p className="text-white/70 mb-4">Game not found.</p>
        <Link href="/library" className="text-primary underline">Back to Library</Link>
      </FullScreenOverlay>
    );
  }

  if (phase === "loading") {
    return (
      <FullScreenOverlay gradient={game.cover}>
        <Spinner />
        <p className="mt-4 text-sm font-medium text-white/70">Launching {game.title}…</p>
      </FullScreenOverlay>
    );
  }

  if (phase === "submitting") {
    return (
      <FullScreenOverlay>
        <Spinner />
        <p className="mt-4 text-sm text-white/60">Saving score…</p>
      </FullScreenOverlay>
    );
  }

  if (phase === "done") {
    return (
      <FullScreenOverlay>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 border border-primary/40 mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Score saved!</h1>
        {xpEarned > 0 && (
          <p className="mt-2 text-lg font-semibold text-primary">+{xpEarned} XP earned</p>
        )}
        <p className="mt-2 text-sm text-white/50">Returning to game page…</p>
      </FullScreenOverlay>
    );
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Slim top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={async () => {
              await endSessionOnce();
              router.push(`/games/${game.id}`);
            }}
            className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/70 hover:text-white hover:bg-black/70 transition-colors"
          >
            ← Exit
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {game.title}
          </span>
        </div>
        <p className="font-mono text-xs tabular-nums text-white/40">{mins}:{secs}</p>
      </div>

      {/* Full-viewport iframe */}
      <GameIframe
        src={entry.indexPath}
        onGameComplete={handleGameComplete}
        fullscreen
      />
    </div>
  );
}

function FullScreenOverlay({ children, gradient }: { children: React.ReactNode; gradient?: string }) {
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center bg-black ${gradient ? `bg-gradient-to-br ${gradient}` : ""}`}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-primary shadow-[0_0_20px_rgba(140,92,255,0.4)]" />
  );
}
