// POST /api/admin/games/upload-cover — upload a cover image file (admin only).
// Accepts multipart/form-data with a `file` field, stores it in the public
// `game-covers` Supabase Storage bucket, and returns the public URL to save in
// a game's `cover_image`. The service-role client bypasses Storage RLS.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminUser } from "@/lib/auth/admin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "game-covers";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPG, WEBP, or GIF." },
      { status: 422 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB." }, { status: 422 });
  }

  const path = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const db = getSupabaseAdmin();
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) throw new Error(error.message);

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/admin/games/upload-cover:", err);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }
}
