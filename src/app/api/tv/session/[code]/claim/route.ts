// POST /api/tv/session/[code]/claim  → { user: { name } }  (+ sets kf_auth)
//
// The step that turns a paired code into a signed-in TV. The phone authorized
// the pairing; here the TV redeems its own secret for a normal KinetoFun
// session, so every existing API (/api/sessions, /api/scores, /api/favorites …)
// works on the TV with no changes at all.
//
// What the TV receives is a standard session cookie minted server-side — never
// the user's password, and never anything that travelled through the QR code.
// Authorization is the `x-tv-secret` header: only the client that created this
// pairing session can claim it, and only after a phone has authenticated it.

import { NextRequest, NextResponse } from "next/server";
import { getUserRepository } from "@/lib/auth/repository";
import { createSession } from "@/lib/auth/session";
import { verifyToken } from "@/lib/auth/jwt";
import { toAuthUser } from "@/lib/auth/serialize";
import { markEnded, markReady, revokeTvAuthSession } from "@/lib/data/tv-repository";
import { isTerminal, isTvRequest, loadSessionByCode, sessionMeta } from "@/lib/tv/request";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const loaded = await loadSessionByCode(code);
    if ("notFound" in loaded) return loaded.notFound;

    const { row, status } = loaded;

    if (!isTvRequest(request, row)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isTerminal(status)) {
      return NextResponse.json({ status, error: "This TV session has ended." }, { status: 410 });
    }

    if (status !== "authenticated" && status !== "ready") {
      return NextResponse.json(
        { status, error: "Nobody has connected to this TV yet." },
        { status: 409 },
      );
    }

    if (!row.user_id) {
      return NextResponse.json({ error: "This TV session has no user." }, { status: 409 });
    }

    const record = await getUserRepository().findById(row.user_id);
    if (!record || record.active === false) {
      // The paired account is gone or suspended — retire the pairing so the TV
      // falls back to showing a fresh QR rather than sitting on a dead session.
      await markEnded(row.id);
      return NextResponse.json(
        { status: "ended" as const, error: "This TV session is no longer valid." },
        { status: 410 },
      );
    }

    const user = toAuthUser(record);

    // Claiming is idempotent (the TV may reload this screen), but each claim
    // mints a fresh session. Revoke the previous one first so repeated reloads
    // can't pile up auth_sessions rows that `leave` would no longer know about.
    if (row.auth_session_id) {
      await revokeTvAuthSession(row.auth_session_id);
    }

    // Mints the JWT, writes the revocable auth_sessions row, and sets the
    // httpOnly cookie on this response — the same call login/register use.
    const token = await createSession(user, sessionMeta(request));

    // Recover the session id from the token we just issued so `leave` can
    // revoke exactly this session later, without touching the phone's.
    const payload = await verifyToken(token);
    await markReady(row.id, payload?.sid ?? null);

    return NextResponse.json({ user: { name: user.name } });
  } catch (err) {
    console.error("[api] POST /api/tv/session/[code]/claim:", err);
    return NextResponse.json(
      { error: "Failed to finish setting up this TV." },
      { status: 500 },
    );
  }
}
