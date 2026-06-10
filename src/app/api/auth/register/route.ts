// POST /api/auth/register — create an account, hash the password, start a session.

import { NextResponse } from "next/server";
import { registerSchema, toFieldErrors } from "@/lib/auth/validation";
import { getUserRepository } from "@/lib/auth/repository";
import { hashPassword } from "@/lib/auth/password";
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fix the highlighted fields.",
        fields: toFieldErrors(parsed.error),
      } satisfies AuthError,
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const repo = getUserRepository();

    if (await repo.findByEmail(email)) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
          fields: { email: ["This email is already registered."] },
        } satisfies AuthError,
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const record = await repo.create({ name, email, passwordHash });
    const user = toAuthUser(record);

    await createSession(user);
    return NextResponse.json({ user } satisfies AuthSuccess, { status: 201 });
  } catch (err) {
    console.error("[auth] register failed:", err);
    return NextResponse.json(
      { error: "Something went wrong creating your account." } satisfies AuthError,
      { status: 500 },
    );
  }
}
