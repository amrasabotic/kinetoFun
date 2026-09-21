// GET  /api/games/[id]/rating  — current user's rating for this game
// POST /api/games/[id]/rating  — submit/update user's rating (score 1-5)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { upsertRating, getUserRating } from "@/lib/data/ratings-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ratingSchema = z.object({
  score: z
    .number()
    .int("score must be an integer")
    .min(1, "score must be between 1 and 5")
    .max(5, "score must be between 1 and 5"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ rating: null }, { status: 200 });
  }

  const { id: gameId } = await params;
  try {
    const rating = await getUserRating(user.id, gameId);
    return NextResponse.json({ rating });
  } catch (err) {
    console.error("[api] GET /api/games/[id]/rating:", err);
    return NextResponse.json({ error: "Failed to load rating." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gameId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const rating = await upsertRating(user.id, gameId, parsed.data.score);
    return NextResponse.json({ rating }, { status: 200 });
  } catch (err) {
    console.error("[api] POST /api/games/[id]/rating:", err);
    return NextResponse.json({ error: "Failed to submit rating." }, { status: 500 });
  }
}
