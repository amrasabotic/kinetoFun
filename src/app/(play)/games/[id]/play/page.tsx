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
import type { AchievementSyncResult, BadgeSummary, GameRewardResult } from "@/lib/rewards/catalog";
import { syncAchievements } from "@/services/achievements.service";

/** In-game achievements collected during this visit to the play page. */
interface Collected {
  achievements: AchievementSyncResult["newAchievements"];
  badges: BadgeSummary[];
  tickets: number;
}

const NOTHING_COLLECTED: Collected = { achievements: [], badges: [], tickets: 0 };

type Phase = "loading" | "playing" | "submitting" | "done";

interface ScoreResponse {
  xpEarned: number;
  rewards: GameRewardResult | null;
}

async function postScore(
  gameId: string,
  score: number,
  sessionId: string | null,
): Promise<ScoreResponse> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, score, ...(sessionId && { sessionId }) }),
  });
  if (!res.ok && res.status !== 401) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to submit score.");
  }
  const json = (await res.json().catch(() => ({}))) as Partial<ScoreResponse>;
  return { xpEarned: json.xpEarned ?? 0, rewards: json.rewards ?? null };
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
  const [rewards, setRewards] = useState<GameRewardResult | null>(null);
  const [collected, setCollected] = useState<Collected>(NOTHING_COLLECTED);
  const sentAchievementsRef = useRef(new Set<string>());
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

  const collectAchievements = useCallback(async (reportedIds: string[] = []) => {
    if (!game) return;
    const result = await syncAchievements(game.id, sentAchievementsRef.current, reportedIds);
    if (!result || (result.newAchievements.length === 0 && result.newBadges.length === 0)) return;
    setCollected((prev) => ({
      achievements: [...prev.achievements, ...result.newAchievements],
      badges: [...prev.badges, ...result.newBadges],
      tickets: prev.tickets + result.ticketsEarned,
    }));
  }, [game]);

  useEffect(() => {
    if (!game || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession(game.id)
      .then((id) => {
        sessionIdRef.current = id;
        if (id) {
          invalidateContinuePlaying();
          // Picks up achievements unlocked on earlier visits, including those
          // from before the platform started collecting them.
          collectAchievements();
        }
      })
      .catch(() => { /* non-fatal */ });

    return () => {
      endSessionOnce();
    };
  }, [game, endSessionOnce, collectAchievements]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const handleGameComplete = useCallback(async (score: number) => {
    if (!game) return;
    setPhase("submitting");
    try {
      // Submit before ending the session: the server checks the session when
      // deciding whether this game earns tickets.
      const result = await postScore(game.id, score, sessionIdRef.current);
      setXpEarned(result.xpEarned);
      setRewards(result.rewards);
      await collectAchievements();
      await endSessionOnce();
      invalidateContinuePlaying();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save score.";
      toast.error(msg);
    } finally {
      setPhase("done");
    }
  }, [game, refresh, endSessionOnce, collectAchievements]);

  useEffect(() => {
    if (phase !== "done") return;
    // Games are played on a TV without a mouse, so this screen must leave on
    // its own; stay longer when there is a reward summary to read.
    const hasSummary = (rewards && rewards.lines.length > 0) || collected.achievements.length > 0;
    const delay = hasSummary ? 7000 : 2000;
    const timeout = setTimeout(() => {
      if (game) router.push(`/games/${game.id}`);
    }, delay);
    return () => clearTimeout(timeout);
  }, [phase, game, router, rewards, collected]);

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
        {(rewards || collected.achievements.length > 0) && (
          <RewardSummary rewards={rewards} collected={collected} />
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
              await collectAchievements();
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
        onAchievementUnlocked={(id) => { collectAchievements([id]); }}
        fullscreen
      />
    </div>
  );
}

function RewardSummary({
  rewards,
  collected,
}: {
  rewards: GameRewardResult | null;
  collected: Collected;
}) {
  const badges = [...(rewards?.newBadges ?? []), ...collected.badges];
  return (
    <div className="mt-5 w-80 max-w-[calc(100vw-2rem)] space-y-3">
      {rewards && rewards.ticketsEarned > 0 && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
          <p className="text-center text-xl font-black text-amber-300">
            🎟️ +{rewards.ticketsEarned} tickets
          </p>
          <ul className="mt-2 space-y-1 text-sm text-white/70">
            {rewards.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-3">
                <span>{line.label}</span>
                <span className="tabular-nums text-amber-200">+{line.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {collected.achievements.length > 0 && (
        <div className="rounded-2xl border border-sky-300/30 bg-sky-400/10 p-4">
          <p className="text-center text-sm font-bold text-sky-200">
            {collected.achievements.length === 1 ? "New collectible" : `${collected.achievements.length} new collectibles`}
            {collected.tickets > 0 && ` · 🎟️ +${collected.tickets}`}
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {collected.achievements.slice(0, 8).map((a) => (
              <li
                key={a.id}
                title={a.description}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80"
              >
                <span aria-hidden>{a.emoji}</span>
                {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/15 p-3"
        >
          <span className="text-3xl" aria-hidden>{badge.emoji}</span>
          <span className="text-left">
            <span className="block text-sm font-bold text-white">New badge: {badge.title}</span>
            <span className="block text-xs text-white/60">{badge.description}</span>
          </span>
        </div>
      ))}
      {rewards && rewards.streak.current > 1 && (
        <p className="text-center text-sm font-semibold text-orange-300">
          🔥 {rewards.streak.current}-day streak
        </p>
      )}
      {rewards?.dailyLimitReached && (
        <p className="text-center text-xs text-white/50">
          You have earned all of today&apos;s tickets. Come back tomorrow for more!
        </p>
      )}
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
