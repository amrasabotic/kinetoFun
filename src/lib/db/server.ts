// Server-only Postgres client for KinetoFun.
//
// Direct connection via DATABASE_URL (AWS RDS). Authentication is the custom
// JWT system in `@/lib/auth` — this module is database-only. Never import from
// a Client Component.

import { Pool, types, type QueryResult, type QueryResultRow } from "pg";

// Return timestamptz / timestamp as ISO strings (not Date objects).
types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) => v);
types.setTypeParser(types.builtins.TIMESTAMP, (v) => v);

const DATABASE_URL = process.env.DATABASE_URL;

/** True when DATABASE_URL is set. */
export function isDbConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

/** @deprecated Use isDbConfigured. Kept for transitional call sites. */
export const isSupabaseConfigured = isDbConfigured;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error("[db] DATABASE_URL must be set.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

/** Run a parameterized query and return all rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result: QueryResult<T> = await getPool().query<T>(text, params);
  return result.rows;
}

/** Run a parameterized query and return the first row, or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a parameterized query and return the Postgres result (for rowCount etc.). */
export async function execute(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult> {
  return getPool().query(text, params);
}

/** Run COUNT(*) style query expecting a single numeric aggregate. */
export async function queryCount(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  const row = await queryOne<{ count: string | number }>(text, params);
  return Number(row?.count ?? 0);
}

/** True when a Postgres error is undefined_column (42703). */
export function isUndefinedColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    /column .* does not exist/i.test(e.message ?? "")
  );
}
