// JWT signing + verification via `jose` (the library the in-repo Next.js docs
// recommend for stateless sessions; it runs in both the Node.js and Edge
// runtimes). Algorithm is pinned to HS256 and the issuer/audience are validated
// on every verify, so a token with a swapped `alg` (e.g. "none") is rejected.

import { SignJWT, jwtVerify } from "jose";
import { authConfig, getAuthSecret } from "./config";
import type { JwtPayload } from "@/types/auth";

const ALG = "HS256";

// Encoded lazily (and cached) so the secret is only resolved at request time —
// see `getAuthSecret`.
let cachedKey: Uint8Array | null = null;
function encodedKey(): Uint8Array {
  if (!cachedKey) cachedKey = new TextEncoder().encode(getAuthSecret());
  return cachedKey;
}

/** Sign a session token. Always includes the user id (`sub`) and an expiry. */
export async function signToken(
  claims: { sub: string; email: string; name: string; role?: string; sid?: string },
  maxAgeSeconds: number = authConfig.maxAgeSeconds,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    ...(claims.role ? { role: claims.role } : {}),
    ...(claims.sid ? { sid: claims.sid } : {}),
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setIssuer(authConfig.issuer)
    .setAudience(authConfig.audience)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(encodedKey());
}

/**
 * Verify a token's signature, algorithm, issuer, audience, and expiry.
 * Returns the decoded payload, or `null` for any invalid/expired token.
 * Safe to call from the proxy for optimistic checks (no DB access).
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey(), {
      algorithms: [ALG],
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    });

    if (typeof payload.sub !== "string") return null;

    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
      role: ["admin", "superadmin"].includes(payload.role as string)
        ? (payload.role as "admin" | "superadmin")
        : "user",
      sid: typeof payload.sid === "string" ? payload.sid : undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
