// POST /api/auth/login — verify credentials, start a session.

import { NextResponse } from "next/server";
import { loginSchema, toFieldErrors } from "@/lib/auth/validation";
import { getUserRepository } from "@/lib/auth/repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { toAuthUser } from "@/lib/auth/serialize";
import type { AuthError, AuthSuccess } from "@/types/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." } satisfies AuthError,
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fix the highlighted fields.",
        fields: toFieldErrors(parsed.error),
      } satisfies AuthError,
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  try {
    const record = await getUserRepository().findByEmail(email);

    // Constant-ish work whether or not the user exists, to avoid leaking which
    // emails are registered via response timing.
    const valid = record
      ? await verifyPassword(password, record.password_hash)
      : (await hashPassword(password), false);

    if (!record || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password." } satisfies AuthError,
        { status: 401 },
      );
    }

    const user = toAuthUser(record);
    await createSession(user);
    return NextResponse.json({ user } satisfies AuthSuccess);
  } catch (err) {
    console.error("[auth] login failed:", err);
    return NextResponse.json(
      { error: "Something went wrong signing you in." } satisfies AuthError,
      { status: 500 },
    );
  }
}
