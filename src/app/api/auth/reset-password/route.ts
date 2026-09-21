// POST /api/auth/reset-password — consume a reset token, set a new password.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { resetPasswordSchema, toFieldErrors } from "@/lib/auth/validation";
import { getUserRepository } from "@/lib/auth/repository";
import { getPasswordResetRepository } from "@/lib/auth/password-reset-repository";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { tooManyRequests } from "@/lib/auth/http";
import type { AuthError } from "@/types/auth";

export async function POST(request: Request) {
  const ip = clientIp(request);

  // Caps brute-forcing the token itself.
  const gate = rateLimit(`reset-password:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!gate.ok) return tooManyRequests(gate.retryAfterSec);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." } satisfies AuthError,
      { status: 400 },
    );
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fix the highlighted fields.",
        fields: toFieldErrors(parsed.error),
      } satisfies AuthError,
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const resetRepo = getPasswordResetRepository();
    const record = await resetRepo.findValid(tokenHash);

    if (!record) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." } satisfies AuthError,
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    await getUserRepository().updatePassword(record.userId, passwordHash);
    await resetRepo.markUsed(tokenHash);

    // A password reset is a strong signal the old credentials may be
    // compromised — sign out every existing session, same as "logout everywhere".
    await destroyAllSessions(record.userId);

    return NextResponse.json({ message: "Your password has been reset. Please sign in." });
  } catch (err) {
    console.error("[auth] reset-password failed:", err);
    return NextResponse.json(
      { error: "Something went wrong resetting your password." } satisfies AuthError,
      { status: 500 },
    );
  }
}
