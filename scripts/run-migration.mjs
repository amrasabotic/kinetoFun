// Usage: node scripts/run-migration.mjs <migration-file>
// Reads Supabase credentials from .env.local and runs the SQL via the REST API.

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Parse .env.local
const env = {};
try {
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(root, migrationFile), "utf8");

// Supabase doesn't expose a generic SQL endpoint via JS client for DDL.
// Use the pg REST endpoint via fetch with the service role key.
const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  // exec_sql may not exist — print the SQL for manual run
  console.log("\nexec_sql RPC not available. Run this SQL manually in your Supabase SQL editor:\n");
  console.log("─".repeat(60));
  console.log(sql);
  console.log("─".repeat(60));
} else {
  console.log("Migration applied successfully.");
}
