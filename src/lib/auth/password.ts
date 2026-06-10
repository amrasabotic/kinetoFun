// Password hashing using Node's built-in scrypt KDF.
//
// scrypt is a memory-hard, salted password hashing algorithm built into Node's
// `crypto` module — no external dependency, no native build step (which keeps
// installs reliable on Windows), and it is a recommended bcrypt alternative.
// Each hash carries its own random salt and the cost parameters, encoded as:
//
//   scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
//
// so future cost changes stay backward-compatible with already-stored hashes.

import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/** Promise wrapper around `scrypt` (its `promisify` overload drops `options`). */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// Cost parameters. N must be a power of two. 2^15 keeps memory (~128*N*r bytes
// ≈ 32MB) and CPU within Node's defaults while remaining strong.
const N = 32768;
const R = 8;
const P = 1;
// Memory ceiling for scrypt (default is 32MB which is exactly at our usage).
const MAX_MEM = 64 * 1024 * 1024;

/** Hash a plaintext password into a self-describing, salted digest. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Verify a plaintext password against a stored digest in constant time. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");

    const derived = await scryptAsync(
      password.normalize("NFKC"),
      salt,
      expected.length,
      { N: Number(nStr), r: Number(rStr), p: Number(pStr), maxmem: MAX_MEM },
    );

    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    // Malformed hash, bad params, etc. — treat as a non-match, never throw.
    return false;
  }
}
