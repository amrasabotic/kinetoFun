// Local, file-backed password-reset-token repository — the default when no
// DATABASE_URL is configured. Mirrors local-session-repository's approach.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  NewPasswordResetToken,
  PasswordResetRepository,
  PasswordResetTokenRecord,
} from "../password-reset-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "password-reset-tokens.json");

async function readAll(): Promise<PasswordResetTokenRecord[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as PasswordResetTokenRecord[];
  } catch {
    return [];
  }
}

async function writeAll(rows: PasswordResetTokenRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export class LocalPasswordResetRepository implements PasswordResetRepository {
  async create(token: NewPasswordResetToken): Promise<void> {
    const rows = await readAll();
    rows.push({
      id: randomUUID(),
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: null,
    });
    await writeAll(rows);
  }

  async findValid(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const rows = await readAll();
    const row = rows.find((r) => r.tokenHash === tokenHash);
    if (!row) return null;
    if (row.usedAt) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) return null;
    return row;
  }

  async markUsed(tokenHash: string): Promise<void> {
    const rows = await readAll();
    const idx = rows.findIndex((r) => r.tokenHash === tokenHash);
    if (idx === -1) return;
    rows[idx] = { ...rows[idx], usedAt: new Date().toISOString() };
    await writeAll(rows);
  }
}
