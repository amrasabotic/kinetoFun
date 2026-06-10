// Server-only Supabase client — the database layer for KinetoFun.
//
// Supabase is used as a DATABASE ONLY (Postgres). We do NOT use Supabase Auth —
// authentication is the custom JWT system in `@/lib/auth`. This client uses the
// SERVICE ROLE key and runs only on the server (route handlers, repositories,
// server components). Never import it from a Client Component, and never expose
// the service-role key to the browser.
//
// Requires the Node process to trust the machine's TLS root CA — the npm scripts
// set `NODE_OPTIONS=--use-system-ca` (see ADR-007).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

/** True when the Supabase database is configured via environment variables. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

let client: SupabaseClient | null = null;

/**
 * Get the shared server-side Supabase admin client (service role → bypasses
 * RLS). Lazy + cached. Throws if env isn't configured.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "[supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL as string, SERVICE_KEY as string, {
      // No Supabase Auth: don't persist/refresh any auth session.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
