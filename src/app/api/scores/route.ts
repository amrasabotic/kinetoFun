// POST /api/scores  { gameId: string, score: number }
// Requires an active session (httpOnly cookie).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { submitScore } from "@/lib/data/scores-repository";
import { getUserRepository } from "@/lib/auth/repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  score: z.number().int().min(0, "score must be a non-negative integer"),
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
    const score = await submitScore(user.id, parsed.data.gameId, parsed.data.score);

    // Award XP: formula = max(10, floor(score / 10))
    const xpEarned = Math.max(10, Math.floor(parsed.data.score / 10));
    console.log(`[api] Awarding ${xpEarned} XP to user ${user.id}`);
    try {
      await getUserRepository().addXp(user.id, xpEarned);
      console.log(`[api] XP awarded successfully`);
    } catch (xpErr) {
      console.error("[api] Failed to award XP:", xpErr);
      // Don't fail the entire request if XP award fails — score is still valid
    }

    return NextResponse.json({ score, xpEarned }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/scores:", err);
    return NextResponse.json({ error: "Failed to submit score." }, { status: 500 });
  }
}
