// POST /api/tv/session/[code]/join  → { ok: true, status: "authenticated" }
//
// The phone half of pairing. This is the ONLY endpoint that attaches a user to
// a TV, and it runs entirely on the existing auth system: the caller must
// already hold a valid `kf_auth` cookie (they just logged in or were already
// signed in). No new authentication mechanism, no token in the QR.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { tooManyRequests } from "@/lib/auth/http";
import { markAuthenticated } from "@/lib/data/tv-repository";
import { EXPIRED_MESSAGE, isTerminal, loadSessionByCode } from "@/lib/tv/request";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Blunts code guessing: a valid account still can't sweep the 6-char space.
  const gate = rateLimit(`tv-join:ip:${clientIp(request)}`, 30, 5 * 60 * 1000);
  if (!gate.ok) return tooManyRequests(gate.retryAfterSec);

  const { code } = await params;

  try {
    const loaded = await loadSessionByCode(code);
    if ("notFound" in loaded) return loaded.notFound;

    const { row, status } = loaded;

    if (isTerminal(status)) {
      return NextResponse.json(
        { error: EXPIRED_MESSAGE, code: "expired" },
        { status: 410 },
      );
    }

    // Already paired. Same user (a refresh, a double tap, a re-scan) is a no-op
    // success; a different user is refused — taking over a live TV has to be an
    // explicit act on the TV itself, not something a stranger can do by
    // scanning a code they can see.
    if (status === "authenticated" || status === "ready") {
      if (row.user_id === user.id) {
        return NextResponse.json({ ok: true, status });
      }
      return NextResponse.json(
        {
          error: "This TV is already connected to another account.",
          code: "already_paired",
        },
        { status: 409 },
      );
    }

    // The guarded UPDATE is the concurrency check: if two phones race the same
    // code, exactly one gets a row back.
    const updated = await markAuthenticated(row.id, user.id);
    if (!updated) {
      return NextResponse.json(
        { error: EXPIRED_MESSAGE, code: "expired" },
        { status: 410 },
      );
    }

    return NextResponse.json({ ok: true, status: "authenticated" as const });
  } catch (err) {
    console.error("[api] POST /api/tv/session/[code]/join:", err);
    return NextResponse.json(
      { error: "Failed to connect to the TV." },
      { status: 500 },
    );
  }
}
