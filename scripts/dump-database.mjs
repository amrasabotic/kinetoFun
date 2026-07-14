/**
 * Dump Supabase public schema + live table data to a single .sql file.
 *
 * Uses the service-role REST API (no direct Postgres password required).
 * Set DATABASE_URL for a pg_dump schema section via Supabase CLI; otherwise
 * falls back to supabase/schema.sql + supabase/migrations/*.sql.
 *
 * Usage: node scripts/dump-database.mjs [output-path]
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // optional
  }
  return env;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

const VIEWS = new Set(["game_leaderboards"]);

async function discoverTables(supabaseUrl, serviceKey) {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) throw new Error(`OpenAPI discovery failed: ${res.status}`);
  const spec = await res.json();
  return Object.keys(spec.paths ?? {})
    .map((p) => p.replace(/^\//, "").split("?")[0])
    .filter(
      (name) =>
        name &&
        !name.startsWith("rpc/") &&
        !VIEWS.has(name),
    );
}

const TABLE_ORDER = [
  "users",
  "categories",
  "games",
  "platform_settings",
  "scores",
  "game_sessions",
  "session_players",
  "auth_sessions",
  "subscriptions",
  "game_ratings",
  "audit_logs",
];

function sortTables(tables) {
  const rank = new Map(TABLE_ORDER.map((name, i) => [name, i]));
  return [...tables].sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a) : 999;
    const rb = rank.has(b) ? rank.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

async function fetchAllRows(supabaseUrl, serviceKey, table) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", "*");
    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Range: `${from}-${from + pageSize - 1}`,
        Prefer: "count=exact",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${table}: ${res.status} ${body}`);
    }

    const data = await res.json();
    if (!data.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function rowsToInsertSql(table, rows) {
  if (!rows.length) {
    return `-- ${table}: 0 rows\n`;
  }

  const columns = Object.keys(rows[0]);
  const lines = [`-- ${table}: ${rows.length} row(s)`];

  for (const row of rows) {
    const values = columns.map((col) => sqlLiteral(row[col]));
    lines.push(
      `INSERT INTO public.${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function readSchemaFallback() {
  const parts = [];
  const schemaPath = join(root, "supabase", "schema.sql");
  parts.push(readFileSync(schemaPath, "utf8"));

  const migrationsDir = join(root, "supabase", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  parts.push(
    "\n-- ── Additional migrations (may overlap idempotently with schema.sql) ──\n",
  );
  for (const file of migrations) {
    parts.push(`-- ${file}\n`);
    parts.push(readFileSync(join(migrationsDir, file), "utf8"));
    parts.push("\n");
  }

  return parts.join("\n");
}

function tryPgDumpSchema(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const cmd = `npx supabase db dump --db-url "${databaseUrl.replace(/"/g, '\\"')}"`;
    return execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_USE_SYSTEM_CA: "1" },
    });
  } catch (err) {
    console.warn("pg_dump via Supabase CLI failed; using repo schema files.");
    console.warn(err.stderr?.toString?.() ?? err.message);
    return null;
  }
}

async function main() {
  const fileEnv = loadEnvFile(join(root, ".env.local"));
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    fileEnv.SUPABASE_URL ??
    fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = resolve(
    process.argv[2] ?? join(root, "supabase", "dumps", `full-dump-${stamp}.sql`),
  );
  mkdirSync(dirname(outPath), { recursive: true });

  const tables = sortTables(await discoverTables(supabaseUrl, serviceKey));
  console.log(`Tables: ${tables.join(", ")}`);

  const databaseUrl = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
  const schemaSql =
    tryPgDumpSchema(databaseUrl) ??
    `-- Schema from repo files (set DATABASE_URL for live pg_dump)\n${readSchemaFallback()}`;

  const chunks = [
    `-- KinetoFun database dump`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Project: ${supabaseUrl}`,
    ``,
    `-- ============================================================================`,
    `-- SCHEMA`,
    `-- ============================================================================`,
    ``,
    schemaSql.trim(),
    ``,
    `-- ============================================================================`,
    `-- DATA`,
    `-- ============================================================================`,
    ``,
    `SET session_replication_role = replica;`,
    ``,
  ];

  for (const table of tables) {
    console.log(`Dumping ${table}...`);
    const rows = await fetchAllRows(supabaseUrl, serviceKey, table);
    chunks.push(rowsToInsertSql(table, rows));
  }

  chunks.push(`SET session_replication_role = DEFAULT;`, ``);
  writeFileSync(outPath, chunks.join("\n"), "utf8");

  const sizeKb = (readFileSync(outPath).length / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
