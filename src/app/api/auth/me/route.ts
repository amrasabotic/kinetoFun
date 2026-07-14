// GET /api/auth/me — validate the session token and return the current user.
// This is the secure check (verifies the JWT AND loads the user from the DB),
// and powers the frontend's auto session-restore on refresh.
// PATCH /api/auth/me — update user profile fields (username, bio, avatar_color).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getUserRepository } from "@/lib/auth/repository";
import { toAuthUser } from "@/lib/auth/serialize";
import type { AuthError, AuthSuccess } from "@/types/auth";

// Always evaluated at request time (reads the session cookie); never cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." } satisfies AuthError,
      { status: 401 },
    );
  }

  return NextResponse.json({ user } satisfies AuthSuccess);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." } satisfies AuthError,
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." } satisfies AuthError,
      { status: 400 },
    );
  }

  const updates: Partial<{
    name: string;
    username: string;
    bio: string;
    avatar_color: string;
    large_text: boolean;
    reduce_motion: boolean;
  }> = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "Display name cannot be empty." } satisfies AuthError,
        { status: 400 },
      );
    }
    if (trimmed.length > 100) {
      return NextResponse.json(
        { error: "Display name is too long (max 100 chars)." } satisfies AuthError,
        { status: 400 },
      );
    }
    updates.name = trimmed;
  }

  if (typeof body.username === "string") {
    const trimmed = body.username.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "Username cannot be empty." } satisfies AuthError,
        { status: 400 },
      );
    }
    if (trimmed.length > 50) {
      return NextResponse.json(
        { error: "Username is too long (max 50 chars)." } satisfies AuthError,
        { status: 400 },
      );
    }
    updates.username = trimmed;
  }

  if (typeof body.bio === "string") {
    const trimmed = body.bio.trim();
    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: "Bio is too long (max 500 chars)." } satisfies AuthError,
        { status: 400 },
      );
    }
    updates.bio = trimmed;
  }

  if (typeof body.avatarColor === "string") {
    updates.avatar_color = body.avatarColor;
  }

  if (typeof body.largeText === "boolean") {
    updates.large_text = body.largeText;
  }

  if (typeof body.reduceMotion === "boolean") {
    updates.reduce_motion = body.reduceMotion;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." } satisfies AuthError,
      { status: 400 },
    );
  }

  try {
    const repo = getUserRepository();
    const updated = await repo.update(user.id, updates);
    return NextResponse.json({ user: toAuthUser(updated) } satisfies AuthSuccess);
  } catch (err) {
    console.error("Failed to update user:", err);
    return NextResponse.json(
      { error: "Failed to update user profile." } satisfies AuthError,
      { status: 500 },
    );
  }
}
