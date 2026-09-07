// POST /api/tv/session  { deviceKey?, name? }
//   → { sessionId, pairingCode, tvSecret, expiresAt, joinUrl }
//
// Called by the TV itself (Chromium on a Raspberry Pi, or a desktop browser
// simulating one). Deliberately unauthenticated: the whole point of pairing is
// that the TV has no user yet. `tvSecret` is returned exactly once here and is
// the TV's only credential for the rest of the flow — everything else about the
// session is public-by-design (the code is printed on screen).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { tooManyRequests } from "@/lib/auth/http";
import { generateTvSecret, hashTvSecret } from "@/lib/tv/pairing";
import {
  createTvSession,
  endOtherWaitingSessions,
  findOrCreateDevice,
} from "@/lib/data/tv-repository";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  // A real device sends its stable key (e.g. 'KF-TV-001'). A browser simulating
  // a TV may omit it, in which case we mint an anonymous one.
  deviceKey: z.string().trim().min(3).max(64).optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

/**
 * The origin the phone should be sent to. Behind a proxy the request URL is the
 * internal one, so prefer the forwarded headers — same reasoning as the
 * password-reset link in /api/auth/forgot-password.
 */
function resolveOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  // A TV creates a session on boot, on refresh, and every 5 minutes as codes
  // expire — generous, but bounded, so this can't be used to flood the table.
  const gate = rateLimit(`tv-create:ip:${ip}`, 20, 5 * 60 * 1000);
  if (!gate.ok) return tooManyRequests(gate.retryAfterSec);

  // The body is optional: a bare POST is a valid "give me a session" request.
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    const deviceKey =
      parsed.data.deviceKey ?? `kf-tv-anon-${randomBytes(8).toString("hex")}`;
    const deviceId = await findOrCreateDevice(deviceKey, parsed.data.name ?? null);

    const tvSecret = generateTvSecret();
    const session = await createTvSession({
      deviceId,
      secretHash: hashTvSecret(tvSecret),
    });

    // A TV that reloaded left its previous code on screen for nobody; retire it
    // so only the code currently displayed is scannable.
    await endOtherWaitingSessions(deviceId, session.id);

    return NextResponse.json(
      {
        sessionId: session.id,
        pairingCode: session.pairing_code,
        tvSecret,
        expiresAt: session.expires_at,
        joinUrl: `${resolveOrigin(request)}/tv/join/${session.pairing_code}`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api] POST /api/tv/session:", err);
    return NextResponse.json(
      { error: "Failed to create a TV session." },
      { status: 500 },
    );
  }
}
