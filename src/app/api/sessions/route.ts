// POST /api/sessions  { gameId: string }  → { sessionId }
// Starts a new active play session. Requires an active session cookie.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { createSession } from "@/lib/data/sessions-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
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

  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const sessionId = await createSession(user.id, parsed.data.gameId);
    return NextResponse.json({ sessionId }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/sessions:", err);
    return NextResponse.json({ error: "Failed to start session." }, { status: 500 });
  }
}
