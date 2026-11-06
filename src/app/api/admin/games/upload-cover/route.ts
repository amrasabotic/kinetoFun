// POST /api/admin/games/upload-cover — stores a cover image in S3 and returns its public URL.

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
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

  const bucket = process.env.S3_COVERS_BUCKET;
  const publicBaseUrl = process.env.S3_COVERS_PUBLIC_BASE_URL;
  if (!bucket || !publicBaseUrl) {
    return NextResponse.json({ error: "Cover storage is not configured." }, { status: 503 });
  }
  // Refuse a base URL that isn't a bare origin, so a mangled env value never ends up in cover_image.
  if (!/^https:\/\/[a-z0-9.-]+\/?$/i.test(publicBaseUrl)) {
    return NextResponse.json({ error: "Cover storage base URL is misconfigured." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const ext = EXTENSIONS[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a PNG, JPG, WEBP or GIF image." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 413 });
  }

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "Cover storage credentials are not configured." }, { status: 503 });
  }

  const key = `game-covers/${randomUUID()}.${ext}`;
  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    console.error("[api] POST /api/admin/games/upload-cover:", err);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }

  return NextResponse.json(
    { url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`, path: key },
    { status: 201 },
  );
}
