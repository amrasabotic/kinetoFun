// Centralized, server-only auth configuration.
//
// Everything tunable about the auth layer (secret, cookie name, lifetime) lives
// here so there is a single place to change it. Imported only by server code
// (route handlers, proxy, DAL) — never by a Client Component.

/**
 * Used only when no secret is configured AND we're not in production, so the
 * app is runnable out-of-the-box for local development. Real deployments MUST
 * set `JWT_SECRET` (see `.env.example`).
 */
const DEV_FALLBACK_SECRET = "kinetofun-dev-insecure-secret-change-me-please-32";

let cachedSecret: string | null = null;

/**
 * Resolve the HMAC secret used to sign/verify JWTs. Lazy + cached so that the
 * production "secret is required" check happens at request time, not at build
 * time (where `NODE_ENV` is also "production" but no runtime env is loaded).
 */
export function getAuthSecret(): string {
  if (cachedSecret) return cachedSecret;

  const secret =
    process.env.JWT_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "[auth] JWT_SECRET must be set to a value of at least 32 characters in production.",
      );
    }
    cachedSecret = secret;
    return cachedSecret;
  }

  if (secret && secret.length >= 32) {
    cachedSecret = secret;
    return cachedSecret;
  }

  console.warn(
    "[auth] JWT_SECRET is not set (or is too short). Using an INSECURE development fallback. " +
      "Set JWT_SECRET in .env.local — generate one with: openssl rand -base64 32",
  );
  cachedSecret = secret ?? DEV_FALLBACK_SECRET;
  return cachedSecret;
}

export const authConfig = {
  /** Name of the httpOnly session cookie. */
  cookieName: "kf_auth",
  /** Token + cookie lifetime, in seconds (7 days). */
  maxAgeSeconds: 60 * 60 * 24 * 7,
  /** Standard JWT registered claims, pinned and validated on verify. */
  issuer: "kinetofun",
  audience: "kinetofun-web",
} as const;

/** Recommended cookie options. `secure` only in production so http://localhost works. */
export function cookieOptions(maxAgeSeconds: number = authConfig.maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
