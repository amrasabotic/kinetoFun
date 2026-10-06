// POST /api/scores  { gameId: string, score: number, sessionId?: string }
// Requires an active session (httpOnly cookie). When the play session id is
// supplied, the finished game also earns tickets, streak progress and badges.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { submitScore } from "@/lib/data/scores-repository";
import { getUserRepository } from "@/lib/auth/repository";
import { awardForCompletedGame } from "@/lib/rewards/service";
import type { GameRewardResult } from "@/lib/rewards/catalog";
import { z } from "zod";

export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  score: z.number().int().min(0, "score must be a non-negative integer"),
  sessionId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const { gameId, score: points, sessionId } = parsed.data;
    const score = await submitScore(user.id, gameId, points);

    // Award XP: formula = max(10, floor(score / 10))
    const xpEarned = Math.max(10, Math.floor(points / 10));
    try {
      await getUserRepository().addXp(user.id, xpEarned);
    } catch (xpErr) {
      console.error("[api] Failed to award XP:", xpErr);
      // Don't fail the entire request if XP award fails — score is still valid
    }

    // Rewards are best-effort in the same way: a failure here must not lose
    // the score the player just earned.
    let rewards: GameRewardResult | null = null;
    if (sessionId) {
      try {
        const outcome = await awardForCompletedGame({
          userId: user.id,
          gameId,
          sessionId,
          scoreId: score.id,
          score: points,
        });
        if (outcome.eligible) rewards = outcome.result;
      } catch (rewardErr) {
        console.error("[api] Failed to award tickets:", rewardErr);
      }
    }

    return NextResponse.json({ score, xpEarned, rewards }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/scores:", err);
    return NextResponse.json({ error: "Failed to submit score." }, { status: 500 });
  }
}
