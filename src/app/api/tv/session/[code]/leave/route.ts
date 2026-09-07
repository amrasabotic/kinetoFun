// POST /api/tv/session/[code]/leave  → { ok: true }
//
// Ends a pairing and returns the TV to the setup state. Two callers may do it:
//
//   the TV itself   (presents `x-tv-secret`) — "sign out of this TV"
//   the paired user (holds the kf_auth cookie for tv_sessions.user_id) —
//                   "disconnect the TV I left running at home"
//
// Nobody else: a stranger who can see the code on screen cannot kick the
// current user off.
//
// Revocation is deliberately narrow. Only the auth session that was minted FOR
// THE TV is deleted, so the user stays signed in on their phone and everywhere
// else. The TV's cookie is cleared too, but only when the TV is the caller —
// otherwise we would be clearing the requesting user's own cookie.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { destroySession } from "@/lib/auth/session";
import { markEnded, revokeTvAuthSession } from "@/lib/data/tv-repository";
import { isTvRequest, loadSessionByCode } from "@/lib/tv/request";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const loaded = await loadSessionByCode(code);
    if ("notFound" in loaded) return loaded.notFound;

    const { row } = loaded;

    const fromTv = isTvRequest(request, row);
    let fromPairedUser = false;
    if (!fromTv && row.user_id) {
      const user = await getCurrentUser();
      fromPairedUser = user?.id === row.user_id;
    }

    if (!fromTv && !fromPairedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markEnded(row.id);

    if (row.auth_session_id) {
      await revokeTvAuthSession(row.auth_session_id);
    }

    // Clearing the cookie only makes sense when the TV is the one asking.
    if (fromTv) {
      await destroySession();
    }

    return NextResponse.json({ ok: true, status: "ended" as const });
  } catch (err) {
    console.error("[api] POST /api/tv/session/[code]/leave:", err);
    return NextResponse.json(
      { error: "Failed to end the TV session." },
      { status: 500 },
    );
  }
}
