// In-memory sliding-window rate limiter for the auth endpoints.
//
// No external dependency: state lives in a module-level Map, which is the right
// trade-off for a single Node server (`next start`). NOTE: this is per-instance —
// if the app is ever scaled horizontally (multiple processes / serverless), move
// this to a shared store (Redis / a Postgres table) so limits are global.

interface RateLimitResult {
  ok: boolean;
  /** Remaining allowed hits in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the caller may retry (only meaningful when !ok). */
  retryAfterSec: number;
}

// key -> ascending list of hit timestamps (ms) within the active window.
const store = new Map<string, number[]>();

let lastSweep = Date.now();

/** Drop fully-expired keys so the Map can't grow unbounded. */
function maybeSweep(windowMs: number): void {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, hits] of store) {
    const fresh = hits.filter((t) => t > now - windowMs);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}

/**
 * Record an attempt for `key` and report whether it's allowed.
 * Allows at most `limit` hits per rolling `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  maybeSweep(windowMs);

  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    store.set(key, hits);
    const retryAfterMs = hits[0] + windowMs - now;
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  hits.push(now);
  store.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

/** Clear a key's history — call on a successful login so legit users aren't penalized. */
export function rateLimitReset(key: string): void {
  store.delete(key);
}

/** Best-effort client IP from the proxy headers (falls back to "unknown"). */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
