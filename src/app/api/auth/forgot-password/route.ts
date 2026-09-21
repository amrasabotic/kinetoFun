// POST /api/auth/forgot-password — email a password reset link.
//
// Always responds with the same generic success message whether or not the
// email is registered, so this endpoint can't be used to enumerate accounts.

import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { forgotPasswordSchema, toFieldErrors } from "@/lib/auth/validation";
import { getUserRepository } from "@/lib/auth/repository";
import { getPasswordResetRepository } from "@/lib/auth/password-reset-repository";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { tooManyRequests } from "@/lib/auth/http";
import { sendEmail } from "@/lib/email/resend";
import { passwordResetEmail } from "@/lib/email/templates";
import type { AuthError } from "@/types/auth";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GENERIC_SUCCESS = {
  message: "If an account exists for that email, we've sent a reset link.",
};

export async function POST(request: Request) {
  const ip = clientIp(request);

  // Per-IP cap first — cheap, blunts a script hitting this endpoint broadly.
  const ipGate = rateLimit(`forgot-password:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipGate.ok) return tooManyRequests(ipGate.retryAfterSec);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." } satisfies AuthError,
      { status: 400 },
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fix the highlighted fields.",
        fields: toFieldErrors(parsed.error),
      } satisfies AuthError,
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // Tighter per-(IP, email) cap — stops repeated reset spam at one address.
  const idGate = rateLimit(`forgot-password:id:${ip}:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!idGate.ok) return tooManyRequests(idGate.retryAfterSec);

  try {
    const user = await getUserRepository().findByEmail(email);

    // Don't reveal whether the account exists — just skip sending.
    if (user && user.active !== false) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

      await getPasswordResetRepository().create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const origin = request.headers.get("origin") ?? new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${rawToken}`;
      const { subject, html } = passwordResetEmail(resetUrl);
      await sendEmail({ to: user.email, subject, html });
    }

    return NextResponse.json(GENERIC_SUCCESS);
  } catch (err) {
    console.error("[auth] forgot-password failed:", err);
    // Still return the generic success shape — a send/DB error shouldn't leak
    // account existence either, and the user has nothing actionable to do.
    return NextResponse.json(GENERIC_SUCCESS);
  }
}
