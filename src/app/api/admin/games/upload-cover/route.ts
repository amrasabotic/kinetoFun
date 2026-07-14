// POST /api/admin/games/upload-cover — temporarily disabled.
// Cover images stay on existing URLs; new uploads need local/S3 storage later.

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "New cover uploads are temporarily disabled after migrating off Supabase Storage. Existing cover_image URLs still work.",
    },
    { status: 501 },
  );
}
