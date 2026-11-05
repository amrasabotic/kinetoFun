/**
 * Smoke-test S3 PutObject + CloudFront GET for cover uploads.
 * Usage: node scripts/smoke-s3.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const required = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_COVERS_BUCKET",
  "S3_COVERS_PUBLIC_BASE_URL",
];
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
}

const key = `game-covers/smoke-${Date.now()}.txt`;
const body = `kinetofun s3 smoke ${new Date().toISOString()}\n`;
const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

console.log(`Uploading s3://${env.S3_COVERS_BUCKET}/${key} …`);
await s3.send(
  new PutObjectCommand({
    Bucket: env.S3_COVERS_BUCKET,
    Key: key,
    Body: body,
    ContentType: "text/plain",
    CacheControl: "public, max-age=60",
  }),
);
console.log("PutObject OK");

await s3.send(
  new HeadObjectCommand({
    Bucket: env.S3_COVERS_BUCKET,
    Key: key,
  }),
);
console.log("HeadObject OK");

const url = `${env.S3_COVERS_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
console.log(`Fetching CloudFront ${url} …`);
// CloudFront can take a moment to see a brand-new object.
let lastStatus = 0;
let text = "";
for (let attempt = 1; attempt <= 6; attempt++) {
  const res = await fetch(url);
  lastStatus = res.status;
  if (res.ok) {
    text = await res.text();
    break;
  }
  console.log(`  attempt ${attempt}: HTTP ${res.status}, retrying…`);
  await new Promise((r) => setTimeout(r, 1500));
}

if (lastStatus !== 200) {
  console.error(`CloudFront GET failed: HTTP ${lastStatus}`);
  console.error(
    "S3 upload works. Check the CloudFront origin points at kinetofun-storage and allows GET.",
  );
  process.exit(1);
}
if (!text.includes("kinetofun s3 smoke")) {
  console.error("CloudFront returned unexpected body:", text.slice(0, 200));
  process.exit(1);
}

console.log("CloudFront GET OK");
console.log("S3 + CloudFront cover storage is working.");
