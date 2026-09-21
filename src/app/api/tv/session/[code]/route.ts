// GET /api/tv/session/[code]  → { status } | { status, user: { name } }
//
// Two callers, two answers:
//
//   The TV  presents `x-tv-secret` and polls this once a second while waiting.
//           Once paired it also gets the display name for the welcome screen.
//
//   A phone that has just scanned the QR calls it WITHOUT the secret, only to
//           learn whether the code is still usable. It gets the bare status —
//           never the paired user's name — so knowing a code (which is printed
//           on a TV screen, in a room, possibly on camera) reveals nothing
//           about whose account is on it.

import { NextRequest, NextResponse } from "next/server";
import { findPairedUserName, touchLastSeen } from "@/lib/data/tv-repository";
import { isTvRequest, loadSessionByCode } from "@/lib/tv/request";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const loaded = await loadSessionByCode(code);
    if ("notFound" in loaded) return loaded.notFound;

    const { row, status } = loaded;

    // Unauthenticated view: status only.
    if (!isTvRequest(request, row)) {
      return NextResponse.json({ status });
    }

    // The TV's view. Treat the poll as a liveness ping.
    await touchLastSeen(row.id, row.device_id);

    if ((status === "authenticated" || status === "ready") && row.user_id) {
      const name = await findPairedUserName(row.user_id);
      // A paired user who has since been deleted or deactivated leaves the TV
      // holding a session it can't use — report it as ended so the TV recovers
      // by generating a fresh code.
      if (!name) return NextResponse.json({ status: "ended" as const });
      return NextResponse.json({ status, user: { name } });
    }

    return NextResponse.json({ status });
  } catch (err) {
    console.error("[api] GET /api/tv/session/[code]:", err);
    return NextResponse.json(
      { error: "Failed to read TV session." },
      { status: 500 },
    );
  }
}
