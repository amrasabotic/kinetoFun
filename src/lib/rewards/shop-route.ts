// Shared request handling for the /api/shop/* Route Handlers.

import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import type { AuthUser } from "@/types/auth";
import { ShopError } from "./shop-service";

/**
 * Authenticate, validate the JSON body against `schema`, run `action`, and map
 * ShopError to its status with a message the shop can show to the player.
 */
export async function handleShopPost<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  label: string,
  action: (user: AuthUser, body: T) => Promise<unknown>,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json(await action(user, parsed.data));
  } catch (err) {
    if (err instanceof ShopError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[api] ${label}:`, err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
